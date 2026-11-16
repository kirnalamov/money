from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

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
