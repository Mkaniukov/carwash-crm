"""Pydantic-схемы для формуляра приёмки при закрытии заказа."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class PaymentMethod(str, Enum):
    cash = "cash"
    card = "card"


class CompleteBookingFormBody(BaseModel):
    """Тело запроса POST /worker/bookings/:id/complete (форма приёмки)."""
    client_name: str = Field(..., min_length=1)
    phone: str = Field(..., min_length=1)
    email: Optional[str] = None

    car_plate: str = Field(..., min_length=1, max_length=32)
    payment_method: PaymentMethod

    visible_damage_notes: Optional[str] = None
    no_visible_damage: bool = False
    internal_notes: Optional[str] = None

    signature_image: Optional[str] = None  # base64 data URL
    photos: Optional[List[str]] = None  # base64 data URLs or URLs

    # completed_at, completed_by задаются на бэкенде
