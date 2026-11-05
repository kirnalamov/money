from decimal import Decimal
from typing import Annotated

from pydantic import Field, PlainSerializer

# Keep numeric JSON responses compatible with existing clients.
Money = Annotated[Decimal, Field(max_digits=20, decimal_places=2, allow_inf_nan=False, validate_default=True),
                  PlainSerializer(float, return_type=float, when_used="json")]
