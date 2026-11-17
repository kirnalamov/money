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
_CACHE: Dict[Tuple[str, str], Tuple[float, "Quote"]] = {}
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
        cached = _CACHE.get((symbol, hint))
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
        for (symbol, hint), q in zip(todo, results):
            if isinstance(q, dict) and q:
                while len(_CACHE) >= _CACHE_MAX:
                    _CACHE.pop(next(iter(_CACHE)))
                _CACHE[(symbol.strip().upper(), hint)] = (now, q)
                out[symbol.strip().upper()] = q
    return out


_BOND_CACHE: Dict[str, Tuple[float, dict]] = {}
_BOND_TTL = 15 * 60
_FACE_UNITS = {"SUR": "RUB", "RUB": "RUB", "USD": "USD", "EUR": "EUR", "CNY": "CNY"}


async def get_bond_info(secid: str) -> Optional[dict]:
    """Облигация МосБиржи: цена (в валюте), НКД, купон, даты. Цена торгуется в % от номинала."""
    secid = secid.strip().upper()
    if not _SYM_RE.match(secid):
        return None
    now = time.monotonic()
    cached = _BOND_CACHE.get(secid)
    if cached and now - cached[0] < _BOND_TTL:
        return cached[1]
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers={"User-Agent": _UA}) as client:
            r = await client.get(
                f"https://iss.moex.com/iss/engines/stock/markets/bonds/securities/{secid}.json",
                params={
                    "iss.meta": "off",
                    "iss.only": "securities,marketdata",
                    "securities.columns": "SECID,SHORTNAME,FACEVALUE,FACEUNIT,ACCRUEDINT,COUPONVALUE,COUPONPERIOD,NEXTCOUPON,MATDATE,PREVPRICE",
                    "marketdata.columns": "SECID,BOARDID,LAST,MARKETPRICE,WAPRICE",
                },
            )
        if r.status_code != 200:
            return None
        body = r.json()
        sec_cols = body["securities"]["columns"]
        sec_rows = body["securities"]["data"]
        if not sec_rows:
            return None
        sec = dict(zip(sec_cols, sec_rows[0]))
        md_cols = body["marketdata"]["columns"]
        md = None
        for row in body["marketdata"]["data"]:
            candidate = dict(zip(md_cols, row))
            if candidate.get("BOARDID") in ("TQCB", "TQOB", "TQOD", "TQIR", "TQOE"):
                md = candidate
                break
        md = md or (dict(zip(md_cols, body["marketdata"]["data"][0])) if body["marketdata"]["data"] else {})
        pct = next((md.get(k) for k in ("LAST", "MARKETPRICE", "WAPRICE") if md.get(k)), None) or sec.get("PREVPRICE")
        face = float(sec.get("FACEVALUE") or 1000)
        if not pct:
            return None
        info = {
            "secid": secid,
            "name": sec.get("SHORTNAME") or secid,
            "currency": _FACE_UNITS.get(str(sec.get("FACEUNIT") or "SUR"), "RUB"),
            "face_value": face,
            "price_pct": float(pct),
            "price": round(float(pct) * face / 100, 4),
            "accrued_interest": float(sec.get("ACCRUEDINT") or 0),
            "coupon_value": float(sec["COUPONVALUE"]) if sec.get("COUPONVALUE") is not None else None,
            "coupon_period": int(sec["COUPONPERIOD"]) if sec.get("COUPONPERIOD") is not None else None,
            "next_coupon": sec.get("NEXTCOUPON"),
            "maturity": sec.get("MATDATE"),
        }
    except Exception:
        return None
    while len(_BOND_CACHE) >= 200:
        _BOND_CACHE.pop(next(iter(_BOND_CACHE)))
    _BOND_CACHE[secid] = (now, info)
    return info


_HIST_CACHE: Dict[Tuple[str, str], Tuple[float, List[dict]]] = {}
_HIST_TTL = 30 * 60


async def _hist_moex(client: httpx.AsyncClient, secid: str, since: str) -> List[dict]:
    for market, boards in (("shares", ("TQBR", "TQTF", "TQTD", "TQIF")), ("bonds", ("TQCB", "TQOB"))):
        for board in boards:
            try:
                r = await client.get(
                    f"https://iss.moex.com/iss/engines/stock/markets/{market}/boards/{board}/securities/{secid}/candles.json",
                    params={"interval": 24, "from": since, "iss.meta": "off"},
                )
                if r.status_code != 200:
                    continue
                candles = r.json().get("candles") or {}
                cols, rows = candles.get("columns") or [], candles.get("data") or []
                if not rows:
                    continue
                idx_close, idx_begin = cols.index("close"), cols.index("begin")
                return [{"date": str(row[idx_begin])[:10], "close": float(row[idx_close])} for row in rows if row[idx_close]]
            except (httpx.HTTPError, ValueError, KeyError):
                continue
    return []


async def _hist_yahoo(client: httpx.AsyncClient, symbol: str) -> List[dict]:
    try:
        r = await client.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            params={"interval": "1d", "range": "3mo"},
        )
        if r.status_code != 200:
            return []
        results = (r.json().get("chart") or {}).get("result") or []
        if not results:
            return []
        stamps = results[0].get("timestamp") or []
        closes = ((results[0].get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
        return [
            {"date": time.strftime("%Y-%m-%d", time.gmtime(ts)), "close": float(c)}
            for ts, c in zip(stamps, closes)
            if c
        ]
    except (httpx.HTTPError, ValueError):
        return []


async def _hist_binance(client: httpx.AsyncClient, symbol: str) -> List[dict]:
    try:
        r = await client.get(
            "https://api.binance.com/api/v3/klines",
            params={"symbol": f"{symbol}USDT", "interval": "1d", "limit": 100},
        )
        if r.status_code != 200:
            return []
        return [
            {"date": time.strftime("%Y-%m-%d", time.gmtime(int(k[0]) / 1000)), "close": float(k[4])}
            for k in r.json()
        ]
    except (httpx.HTTPError, ValueError):
        return []


async def get_history(items: List[Tuple[str, str]]) -> Dict[str, List[dict]]:
    """Дневные цены закрытия за ~3 месяца: {тикер: [{date, close}]}. Для расчёта изменения за день/неделю/месяц."""
    now = time.monotonic()
    since = time.strftime("%Y-%m-%d", time.gmtime(time.time() - 100 * 86400))
    out: Dict[str, List[dict]] = {}
    todo: List[Tuple[str, str]] = []
    for symbol, hint in items:
        symbol = symbol.strip().upper()
        if not _SYM_RE.match(symbol):
            continue
        cached = _HIST_CACHE.get((symbol, hint))
        if cached and now - cached[0] < _HIST_TTL:
            out[symbol] = cached[1]
        else:
            todo.append((symbol, hint))
    if todo:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers={"User-Agent": _UA}) as client:
            async def one(symbol: str, hint: str) -> List[dict]:
                if hint == "crypto":
                    return await _hist_binance(client, symbol)
                if hint == "moex":
                    return await _hist_moex(client, symbol, since) or await _hist_yahoo(client, symbol)
                return await _hist_yahoo(client, symbol)

            results = await asyncio.gather(*(one(s, h) for s, h in todo), return_exceptions=True)
        for (symbol, hint), rows in zip(todo, results):
            if isinstance(rows, list) and rows:
                while len(_HIST_CACHE) >= 300:
                    _HIST_CACHE.pop(next(iter(_HIST_CACHE)))
                _HIST_CACHE[(symbol, hint)] = (now, rows)
                out[symbol] = rows
    return out
