"""
Логотипы бумаг портфеля.

Источники (публичные, без ключей), по приоритету:
- МосБиржа (hint=moex): ISIN из ISS -> CDN логотипов брендов по ISIN.
- Крипта (hint=crypto): открытый набор иконок криптовалют, затем Parqet.
- Остальное (hint=global): Parqet по тикеру, затем financialmodelingprep.

Картинки проксируются через бэкенд и кэшируются в памяти: браузер не ходит
к сторонним CDN напрямую, а повторные запросы не нагружают источники.
"""

from __future__ import annotations

import re
import time
from typing import Dict, Optional, Tuple

import httpx

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0 Safari/537.36"
)

HIT_TTL = 7 * 24 * 60 * 60
MISS_TTL = 60 * 60
MAX_BYTES = 300 * 1024
CACHE_MAX = 300

_SYM_RE = re.compile(r"^[A-Z0-9.\-]{1,16}$")
_ISIN_RE = re.compile(r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$")

# ключ -> (время, (байты, content-type) | None)
_CACHE: Dict[str, Tuple[float, Optional[Tuple[bytes, str]]]] = {}
_ISIN_CACHE: Dict[str, Optional[str]] = {}


async def _fetch_image(client: httpx.AsyncClient, url: str) -> Optional[Tuple[bytes, str]]:
    try:
        r = await client.get(url)
    except httpx.HTTPError:
        return None
    if r.status_code != 200:
        return None
    ctype = r.headers.get("content-type", "").split(";")[0].strip().lower()
    if not ctype.startswith("image/"):
        return None
    body = r.content
    if not body or len(body) > MAX_BYTES:
        return None
    return body, ctype


async def _moex_isin(client: httpx.AsyncClient, secid: str) -> Optional[str]:
    if secid in _ISIN_CACHE:
        return _ISIN_CACHE[secid]
    isin: Optional[str] = None
    try:
        r = await client.get(
            f"https://iss.moex.com/iss/securities/{secid}.json",
            params={"iss.meta": "off", "iss.only": "description"},
        )
        if r.status_code == 200:
            for row in (r.json().get("description") or {}).get("data") or []:
                if row and row[0] == "ISIN" and _ISIN_RE.match(str(row[2])):
                    isin = str(row[2])
                    break
    except (httpx.HTTPError, ValueError, IndexError):
        return None
    _ISIN_CACHE[secid] = isin
    return isin


async def get_logo(symbol: str, hint: str) -> Optional[Tuple[bytes, str]]:
    symbol = symbol.strip().upper()
    if not _SYM_RE.match(symbol):
        return None
    if hint not in ("moex", "global", "crypto"):
        hint = "global"
    key = f"{hint}:{symbol}"
    now = time.monotonic()
    cached = _CACHE.get(key)
    if cached:
        ttl = HIT_TTL if cached[1] else MISS_TTL
        if now - cached[0] < ttl:
            return cached[1]

    result: Optional[Tuple[bytes, str]] = None
    async with httpx.AsyncClient(
        timeout=8.0, follow_redirects=True, headers={"User-Agent": _UA}
    ) as client:
        if hint == "moex":
            isin = await _moex_isin(client, symbol)
            if isin:
                result = await _fetch_image(
                    client, f"https://invest-brands.cdn-tinkoff.ru/{isin}x160.png"
                )
        elif hint == "crypto":
            result = await _fetch_image(
                client,
                f"https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/{symbol.lower()}.png",
            ) or await _fetch_image(
                client, f"https://assets.parqet.com/logos/crypto/{symbol}?format=png"
            )
        else:
            result = await _fetch_image(
                client, f"https://assets.parqet.com/logos/symbol/{symbol}?format=png"
            ) or await _fetch_image(
                client, f"https://financialmodelingprep.com/image-stock/{symbol}.png"
            )

    while len(_CACHE) >= CACHE_MAX:
        _CACHE.pop(next(iter(_CACHE)))
    _CACHE[key] = (now, result)
    return result
