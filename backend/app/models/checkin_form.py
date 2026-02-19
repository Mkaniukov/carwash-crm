"""Модель формуляра цифровой приёмки автомобиля при закрытии заказа."""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.session import Base


class CheckInForm(Base):
    __tablename__ = "checkin_forms"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, unique=True)

    car_plate = Column(String(32), nullable=False)
    payment_method = Column(String(16), nullable=False)  # cash | card

    visible_damage_notes = Column(Text, nullable=True)
    no_visible_damage = Column(Boolean, default=False, nullable=False)
    internal_notes = Column(Text, nullable=True)

    signature_image = Column(Text, nullable=True)  # base64 data URL
    photos = Column(Text, nullable=True)  # JSON array of base64 or URLs

    completed_at = Column(DateTime, nullable=False)
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    booking = relationship("Booking", backref="checkin_form")
    completer = relationship("User")
