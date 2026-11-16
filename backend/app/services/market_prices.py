"""
Текущие котировки для позиций портфеля.

Источники (все публичные, без ключей):
- Бумаги МосБиржи (валюта RUB): ISS marketdata, поле LAST/MARKETPRICE.
- Криптовалюта: Binance, пара {SYMBOL}USDT.
- Остальное (акции/ETF США и пр.): Yahoo Finance chart API.

Кэш в памяти на 5 минут, чтобы не нагружать источники.
"""

from __future__ import annotations

import asyncio
import re
import time
from typing import Dict, List, Optional, Tuple, TypedDict

import httpx

CACHE_TTL = 5 * 60
_CACHE: Dict[str, Tuple[float, "Quote"]] = {}
_CACHE_MAX = 300

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0 Safari/537.36"
)

_SYM_RE = re.compile(r"^[A-Z0-9.\-]{1,16}$")


# Основные режимы торгов МосБиржи: акции, ETF/паи, облигации
_PRIMARY_BOARDS = ["TQBR", "TQTF", "TQTD", "TQIF", "TQPI", "TQOB", "TQCB", "TQIR", "TQOD", "TQOE"]
# LAST — цена последней сделки; остальное — запасные варианты вне торговой сессии
_PRICE_FIELDS = ("LAST", "LCURRENTPRICE", "MARKETPRICE", "WAPRICE", "CLOSEPRICE")


class Quote(TypedDict):
    symbol: str
    price: float
    currency: str
    source: str


async def _moex_last(client: httpx.AsyncClient, secid: str) -> Optional[Quote]:
    """LAST/MARKETPRICE с МосБиржи: акции, затем облигации."""
    for market in ("shares", "bonds"):
        try:
            r = await client.get(
                f"https://iss.moex.com/iss/engines/stock/markets/{market}/securities/{secid}.json",
                params={"iss.meta": "off", "iss.only": "marketdata"},
            )
            if r.status_code != 200:
                continue
            md = r.json().get("marketdata") or {}
            cols = md.get("columns") or []
            rows = md.get("data") or []
            if not cols or not rows:
                continue
            # Ответ содержит строки по всем доскам. Брать первую нельзя: например,
            # SPEQ (адресные сделки) отдаёт ориентировочный MARKETPRICE, заметно
            # отличающийся от цены основных торгов. Берём основные доски по приоритету.
            by_board = {}
            for row in rows:
                rec = dict(zip(cols, row))
                by_board.setdefault(rec.get("BOARDID"), rec)
            ordered = [by_board[b] for b in _PRIMARY_BOARDS if b in by_board]
            for rec in ordered:
                for field in _PRICE_FIELDS:
                    value = rec.get(field)
                    if value:
                        price = float(value)
                        if price > 0:
                            # Облигации котируются в % от номинала — фронтенд
                            # для них живые цены не запрашивает.
                            return Quote(
                                symbol=secid, price=price, currency="RUB", source="moex"
                            )
        except (httpx.HTTPError, ValueError, KeyError):
            continue
    return None


async def _binance_price(client: httpx.AsyncClient, symbol: str) -> Optional[Quote]:
    try:
        r = await client.get(
            "https://api.binance.com/api/v3/ticker/price",
            params={"symbol": f"{symbol}USDT"},
        )
        if r.status_code != 200:
            return None
        price = float(r.json().get("price") or 0)
        if price <= 0:
            return None
        return Quote(symbol=symbol, price=price, currency="USD", source="binance")
    except (httpx.HTTPError, ValueError):
        return None


async def _yahoo_price(client: httpx.AsyncClient, symbol: str) -> Optional[Quote]:
    try:
        r = await client.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            params={"interval": "1d", "range": "1d"},
        )
        if r.status_code != 200:
            return None
        results = (r.json().get("chart") or {}).get("result") or []
        if not results:
            return None
        meta = results[0].get("meta") or {}
        price = float(meta.get("regularMarketPrice") or 0)
        if price <= 0:
            return None
        return Quote(
            symbol=symbol,
            price=price,
            currency=str(meta.get("currency") or "USD"),
            source="yahoo",
        )
    except (httpx.HTTPError, ValueError):
        return None


async def _resolve(client: httpx.AsyncClient, symbol: str, hint: str) -> Optional[Quote]:
    """hint: 'crypto' | 'moex' | 'global' — порядок источников."""
    if hint == "crypto":
        return await _binance_price(client, symbol)
    if hint == "moex":
        q = await _moex_last(client, symbol)
        if q:
            return q
        return await _yahoo_price(client, symbol)
    q = await _yahoo_price(client, symbol)
    if q:
        return q
    return await _moex_last(client, symbol)


_DIV_CACHE: Dict[str, Tuple[float, List[dict]]] = {}
_DIV_TTL = 12 * 60 * 60


async def get_us_dividends(symbol: str) -> List[dict]:
    """История дивидендов (дата, сумма на бумагу) из Yahoo chart API, 10 лет."""
    symbol = symbol.strip().upper()
    if not _SYM_RE.match(symbol):
        return []
    now = time.monotonic()
    cached = _DIV_CACHE.get(symbol)
    if cached and now - cached[0] < _DIV_TTL:
        return cached[1]
    out: List[dict] = []
    try:
        async with httpx.AsyncClient(
            timeout=8.0, follow_redirects=True, headers={"User-Agent": _UA}
        ) as client:
            r = await client.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
                params={"interval": "1mo", "range": "10y", "events": "div"},
            )
        if r.status_code == 200:
            results = (r.json().get("chart") or {}).get("result") or []
            if results:
                meta = results[0].get("meta") or {}
                currency = str(meta.get("currency") or "USD")
                divs = ((results[0].get("events") or {}).get("dividends")) or {}
                for item in divs.values():
                    amount = float(item.get("amount") or 0)
                    ts = int(item.get("date") or 0)
                    if amount > 0 and ts > 0:
                        out.append(
                            {
                                "date": time.strftime("%Y-%m-%d", time.gmtime(ts)),
                                "value": amount,
                                "currency": currency,
                            }
                        )
                out.sort(key=lambda d: d["date"])
    except (httpx.HTTPError, ValueError):
        return cached[1] if cached else []
    if len(_DIV_CACHE) >= 100:
        _DIV_CACHE.pop(next(iter(_DIV_CACHE)))
    _DIV_CACHE[symbol] = (now, out)
    return out


async def get_quotes(items: List[Tuple[str, str]]) -> Dict[str, Quote]:
    """items: [(symbol, hint)] -> {symbol: Quote}. Непроверяемые тикеры пропускаются."""
    now = time.monotonic()
    out: Dict[str, Quote] = {}
    todo: List[Tuple[str, str]] = []
    for symbol, hint in items:
        symbol = symbol.strip().upper()
        if not _SYM_RE.match(symbol):
            continue
        cached = _CACHE.get(symbol)
        if cached and now - cached[0] < CACHE_TTL:
            out[symbol] = cached[1]
        else:
            todo.append((symbol, hint))

    if todo:
        async with httpx.AsyncClient(
            timeout=8.0, follow_redirects=True, headers={"User-Agent": _UA}
        ) as client:
            results = await asyncio.gather(
                *(_resolve(client, s, h) for s, h in todo), return_exceptions=True
            )
        for (symbol, _), q in zip(todo, results):
            if isinstance(q, dict) and q:
                while len(_CACHE) >= _CACHE_MAX:
                    _CACHE.pop(next(iter(_CACHE)))
                _CACHE[symbol.strip().upper()] = (now, q)
                out[symbol.strip().upper()] = q
    return out
