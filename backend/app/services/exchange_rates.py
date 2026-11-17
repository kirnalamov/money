import asyncio
import math
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger()

SUPPORTED_CURRENCIES = ("USD", "EUR", "GBP", "RUB")
FALLBACK_RATES = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "RUB": 92.5,
}


@dataclass(frozen=True)
class ExchangeRateSnapshot:
    rates: dict[str, float]
    updated_at: str
    fetched_at: float


_cache = ExchangeRateSnapshot(
    rates=FALLBACK_RATES.copy(),
    updated_at="fallback",
    fetched_at=0,
)
_cache_lock = asyncio.Lock()


def _is_valid_rate(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


def _provider_updated_at(payload: dict[str, Any]) -> str:
    value = payload.get("time_last_update_utc") or payload.get("date")
    return value if isinstance(value, str) and value else datetime.now(timezone.utc).isoformat()


async def _fetch_rates() -> ExchangeRateSnapshot:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(settings.EXCHANGE_RATES_URL)
        response.raise_for_status()
        payload = response.json()

    raw_rates = payload.get("rates")
    if not isinstance(raw_rates, dict):
        raise ValueError("Exchange rate provider returned an invalid response")

    rates = {"USD": 1.0}
    for currency in SUPPORTED_CURRENCIES:
        if currency == "USD":
            continue
        value = raw_rates.get(currency)
        if not _is_valid_rate(value):
            raise ValueError(f"Exchange rate provider did not return {currency}")
        rates[currency] = float(value)

    return ExchangeRateSnapshot(
        rates=rates,
        updated_at=_provider_updated_at(payload),
        fetched_at=time.monotonic(),
    )


async def get_exchange_rates() -> ExchangeRateSnapshot:
    global _cache

    now = time.monotonic()
    ttl = max(settings.EXCHANGE_RATES_TTL_MINUTES, 1) * 60
    if now - _cache.fetched_at < ttl:
        return _cache

    async with _cache_lock:
        now = time.monotonic()
        if now - _cache.fetched_at < ttl:
            return _cache

        try:
            _cache = await _fetch_rates()
            logger.info(
                "exchange_rates_updated",
                provider=settings.EXCHANGE_RATES_URL,
                updated_at=_cache.updated_at,
            )
        except (httpx.HTTPError, ValueError) as exc:
            # Keep the last good snapshot and avoid retrying on every request.
            _cache = ExchangeRateSnapshot(
                rates=_cache.rates,
                updated_at=_cache.updated_at,
                fetched_at=time.monotonic(),
            )
            logger.warning("exchange_rates_update_failed", error=str(exc))

        return _cache
