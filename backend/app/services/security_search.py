"""
Поиск бумаг по тикеру или названию для окон «Сделка» и «Позиция».

Источники (публичные, без ключей):
- МосБиржа ISS: акции, облигации, фонды;
- Yahoo Finance search: акции и ETF мировых рынков;
- Binance: криптовалюты (пары к USDT).
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import Dict, List, Optional, Tuple, TypedDict

import httpx

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0 Safari/537.36"
)

CACHE_TTL = 5 * 60
_CACHE: Dict[str, Tuple[float, List["Found"]]] = {}
_CACHE_MAX = 200

_CRYPTO_TTL = 60 * 60
_crypto: Tuple[float, List[str]] = (0.0, [])

_SYM_RE = re.compile(r"^[A-Z0-9.\-]{1,16}$")
_QUOTE_TYPES = {"EQUITY": "stock", "ETF": "etf", "MUTUALFUND": "etf"}


class Found(TypedDict):
    symbol: str
    name: str
    hint: str  # moex | global | crypto
    asset_class: str  # stock | etf | bond | crypto
    exchange: str


def _moex_class(group: str, type_: str) -> Optional[str]:
    if group == "stock_bonds":
        return "bond"
    if group in ("stock_etf", "stock_ppif") or type_ in ("etf_ppif", "public_ppif", "exchange_ppif"):
        return "etf"
    if group in ("stock_shares", "stock_dr"):
        return "stock"
    return None


async def _search_moex(client: httpx.AsyncClient, q: str) -> List[Found]:
    try:
        r = await client.get(
            "https://iss.moex.com/iss/securities.json",
            params={
                "q": q,
                "iss.meta": "off",
                "limit": 20,
                "securities.columns": "secid,shortname,name,primary_boardid,type,group,is_traded",
            },
        )
        if r.status_code != 200:
            return []
        rows = (r.json().get("securities") or {}).get("data") or []
    except Exception:
        return []
    out: List[Found] = []
    for secid, shortname, name, board, type_, group, traded in rows:
        cls = _moex_class(group or "", type_ or "")
        if not cls or not traded or not secid or not _SYM_RE.match(secid.upper()):
            continue
        out.append(
            {
                "symbol": secid.upper(),
                "name": shortname or name or secid,
                "hint": "moex",
                "asset_class": cls,
                "exchange": f"МосБиржа · {board}" if board else "МосБиржа",
            }
        )
    return out


async def _search_yahoo(client: httpx.AsyncClient, q: str) -> List[Found]:
    try:
        r = await client.get(
            "https://query2.finance.yahoo.com/v1/finance/search",
            params={"q": q, "quotesCount": 10, "newsCount": 0, "listsCount": 0},
        )
        if r.status_code != 200:
            return []
        quotes = r.json().get("quotes") or []
    except Exception:
        return []
    out: List[Found] = []
    for item in quotes:
        cls = _QUOTE_TYPES.get(item.get("quoteType", ""))
        symbol = (item.get("symbol") or "").upper()
        if not cls or not symbol or not _SYM_RE.match(symbol):
            continue
        out.append(
            {
                "symbol": symbol,
                "name": item.get("longname") or item.get("shortname") or symbol,
                "hint": "global",
                "asset_class": cls,
                "exchange": item.get("exchDisp") or item.get("exchange") or "",
            }
        )
    return out


async def _crypto_symbols(client: httpx.AsyncClient) -> List[str]:
    global _crypto
    stamp, symbols = _crypto
    if symbols and time.monotonic() - stamp < _CRYPTO_TTL:
        return symbols
    try:
        r = await client.get("https://api.binance.com/api/v3/ticker/price")
        if r.status_code != 200:
            return symbols
        pairs = [item["symbol"] for item in r.json() if item["symbol"].endswith("USDT")]
    except Exception:
        return symbols
    symbols = sorted({p[: -len("USDT")] for p in pairs if len(p) > 4})
    _crypto = (time.monotonic(), symbols)
    return symbols


async def _search_crypto(client: httpx.AsyncClient, q: str) -> List[Found]:
    symbols = await _crypto_symbols(client)
    needle = q.upper()
    hits = [s for s in symbols if s == needle] + [s for s in symbols if s.startswith(needle) and s != needle]
    return [
        {"symbol": s, "name": s, "hint": "crypto", "asset_class": "crypto", "exchange": "Binance"}
        for s in hits[:4]
    ]


def _rank(item: Found, needle: str) -> Tuple[int, int]:
    symbol = item["symbol"]
    name = item["name"].upper()
    if symbol == needle:
        score = 0
    elif symbol.startswith(needle):
        score = 1
    elif needle in symbol:
        score = 2
    elif name.startswith(needle):
        score = 3
    elif needle in name:
        score = 4
    else:
        score = 5
    return score, len(symbol)


async def search_securities(query: str, limit: int = 10) -> List[Found]:
    q = query.strip()
    if not q:
        return []
    key = q.upper()
    cached = _CACHE.get(key)
    if cached and time.monotonic() - cached[0] < CACHE_TTL:
        return cached[1]

    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers={"User-Agent": _UA}) as client:
        parts = await asyncio.gather(
            _search_moex(client, q), _search_yahoo(client, q), _search_crypto(client, q), return_exceptions=True
        )
    merged: List[Found] = []
    seen = set()
    for part in parts:
        if isinstance(part, BaseException):
            continue
        for item in part:
            ident = (item["symbol"], item["hint"])
            if ident not in seen:
                seen.add(ident)
                merged.append(item)
    merged.sort(key=lambda item: _rank(item, key))
    result = merged[:limit]
    if result:
        while len(_CACHE) >= _CACHE_MAX:
            _CACHE.pop(next(iter(_CACHE)))
        _CACHE[key] = (time.monotonic(), result)
    return result
