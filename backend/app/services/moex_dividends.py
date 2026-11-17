"""
История дивидендов по тикерам МосБиржи.

МосБиржа убрала дивиденды из бесплатного ISS API, поэтому данные берутся
со страницы дивидендов Smart-Lab (факты: тикер, дата отсечки, сумма).
Ответы кэшируются в памяти, чтобы не нагружать источник.
"""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import httpx

CACHE_TTL_SECONDS = 12 * 60 * 60
_CACHE: Dict[str, Tuple[float, List["Dividend"]]] = {}
_CACHE_MAX = 200

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0 Safari/537.36"
)

_TABLE_RE = re.compile(
    r'<table class="simple-little-table financials dividends[^"]*"[^>]*>(.*?)</table>',
    re.S,
)
_ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
_CELL_RE = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_DATE_RE = re.compile(r"^(\d{2})\.(\d{2})\.(\d{4})$")


@dataclass
class Dividend:
    date: str  # ISO yyyy-mm-dd (дата отсечки)
    value: float  # на одну бумагу
    currency: str


def _clean(cell: str) -> str:
    return re.sub(r"\s+", " ", _TAG_RE.sub("", cell)).strip()


def _parse_amount(raw: str) -> Optional[Tuple[float, str]]:
    raw = raw.replace("\xa0", " ").strip()
    currency = "RUB"
    if "$" in raw:
        currency = "USD"
    num = re.sub(r"[^0-9,\.]", "", raw).replace(",", ".")
    if not num:
        return None
    try:
        value = float(num)
    except ValueError:
        return None
    if value <= 0:
        return None
    return value, currency


def _parse_date(raw: str) -> Optional[str]:
    m = _DATE_RE.match(raw.strip())
    if not m:
        return None
    d, mo, y = m.groups()
    try:
        return datetime(int(y), int(mo), int(d)).strftime("%Y-%m-%d")
    except ValueError:
        return None


def parse_dividend_table(html: str, secid: str) -> List[Dividend]:
    table_match = _TABLE_RE.search(html)
    if not table_match:
        return []
    secid = secid.upper()
    exact: List[Dividend] = []
    for row_html in _ROW_RE.findall(table_match.group(1)):
        cells = [_clean(c) for c in _CELL_RE.findall(row_html)]
        # [тикер, дата T-1, дата отсечки, период, дивиденд, цена, доходность]
        if len(cells) < 5 or cells[0].upper() != secid:
            continue
        date = _parse_date(cells[2]) or _parse_date(cells[1])
        amount = _parse_amount(cells[4])
        if not date or not amount:
            continue
        exact.append(Dividend(date=date, value=amount[0], currency=amount[1]))
    exact.sort(key=lambda d: d.date)
    return exact


async def get_dividends(secid: str) -> List[Dividend]:
    secid = secid.strip().upper()
    if not re.fullmatch(r"[A-Z0-9]{1,12}", secid):
        return []

    now = time.monotonic()
    cached = _CACHE.get(secid)
    if cached and now - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    url = f"https://smart-lab.ru/q/{secid}/dividend/"
    try:
        async with httpx.AsyncClient(
            timeout=10.0, follow_redirects=True, headers={"User-Agent": _UA}
        ) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            dividends: List[Dividend] = []
        else:
            dividends = parse_dividend_table(resp.text, secid)
    except httpx.HTTPError:
        # сеть недоступна — отдаём устаревший кэш, если был
        return cached[1] if cached else []

    if len(_CACHE) >= _CACHE_MAX:
        _CACHE.pop(next(iter(_CACHE)))
    _CACHE[secid] = (now, dividends)
    return dividends
