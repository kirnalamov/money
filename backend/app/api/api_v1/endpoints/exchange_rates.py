from typing import Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.deps import get_current_active_user
from app.models.user import User
from app.services.exchange_rates import get_exchange_rates

router = APIRouter()


class ExchangeRatesResponse(BaseModel):
    base: str
    rates: Dict[str, float]
    updated_at: str


@router.get("/", response_model=ExchangeRatesResponse)
async def read_exchange_rates(
    current_user: User = Depends(get_current_active_user),
) -> ExchangeRatesResponse:
    snapshot = await get_exchange_rates()
    return ExchangeRatesResponse(
        base="USD",
        rates=snapshot.rates,
        updated_at=snapshot.updated_at,
    )
