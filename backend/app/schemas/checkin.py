"""Pydantic-схемы для формуляра приёмки и оплаты."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class CarSize(str, Enum):
    small = "small"
    large = "large"


class PaymentMethod(str, Enum):
    cash = "cash"
    card = "card"


class CompleteBookingFormBody(BaseModel):
    """Тело запроса POST /worker/bookings/:id/complete (форма приёмки). Оплата не указывается."""
    client_name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=1)
    email: Optional[str] = None

    service_id: int = Field(..., gt=0)
    car_size: CarSize = CarSize.small
    extra_glanz: bool = False
    regie_price: Optional[float] = Field(None, ge=0)

    car_plate: str = Field(..., min_length=1, max_length=32)

    visible_damage_notes: Optional[str] = None
    no_visible_damage: bool = False
    internal_notes: Optional[str] = None

    signature_image: Optional[str] = None  # base64 data URL
    photos: Optional[List[str]] = None  # base64 data URLs or URLs


class PaymentCreateBody(BaseModel):
    """Тело запроса POST /worker/bookings/:id/pay."""
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod
