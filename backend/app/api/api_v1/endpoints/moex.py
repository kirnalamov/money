from typing import Dict, List, Tuple

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.market_prices import get_quotes, get_us_dividends
from app.services.moex_dividends import get_dividends

router = APIRouter()


class DividendOut(BaseModel):
    date: str
    value: float
    currency: str


class DividendsResponse(BaseModel):
    secid: str
    source: str
    dividends: List[DividendOut]


@router.get("/dividends/{secid}", response_model=DividendsResponse)
async def read_dividends(secid: str) -> DividendsResponse:
    """Публичная история дивидендов по тикеру МосБиржи (без данных пользователя)."""
    dividends = await get_dividends(secid)
    return DividendsResponse(
        secid=secid.strip().upper(),
        source="smart-lab.ru",
        dividends=[DividendOut(**d.__dict__) for d in dividends],
    )


@router.get("/us-dividends/{symbol}", response_model=DividendsResponse)
async def read_us_dividends(symbol: str) -> DividendsResponse:
    """История дивидендов по бумагам США (Yahoo Finance), на одну бумагу."""
    dividends = await get_us_dividends(symbol)
    return DividendsResponse(
        secid=symbol.strip().upper(),
        source="yahoo",
        dividends=[DividendOut(**d) for d in dividends],
    )


class QuoteOut(BaseModel):
    symbol: str
    price: float
    currency: str
    source: str


class PricesResponse(BaseModel):
    prices: Dict[str, QuoteOut]


@router.get("/prices", response_model=PricesResponse)
async def read_prices(
    q: str = Query(
        ...,
        max_length=600,
        description="Список вида SBER:moex,VOO:global,BTC:crypto (hint: moex|global|crypto)",
    ),
) -> PricesResponse:
    """Текущие котировки из публичных источников (MOEX / Binance / Yahoo)."""
    items: List[Tuple[str, str]] = []
    for part in q.split(",")[:30]:
        bits = part.strip().split(":")
        if not bits or not bits[0]:
            continue
        hint = bits[1].strip().lower() if len(bits) > 1 else "global"
        if hint not in ("moex", "global", "crypto"):
            hint = "global"
        items.append((bits[0], hint))
    quotes = await get_quotes(items)
    return PricesResponse(prices={k: QuoteOut(**v) for k, v in quotes.items()})
