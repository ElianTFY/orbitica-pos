from decimal import Decimal
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.common import BaseSchema

class SubscriptionResponse(BaseSchema):
    plan_name: str
    status: str
    branches_limit: int
    branches_used: int
    users_limit: int
    users_used: int
    currency: str
    price_monthly: Decimal
    features: List[str]
