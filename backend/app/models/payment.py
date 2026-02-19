"""Модель оплаты заказа. Создаётся после подписания формуляра (status=checked_in)."""
from sqlalchemy import Column, Integer, Numeric, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.session import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(16), nullable=False)  # cash | card
    paid_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    booking = relationship("Booking", backref="payments")
    payer = relationship("User")
