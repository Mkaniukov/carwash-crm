from sqlalchemy import Column, Integer, String
from app.db.session import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True)

    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=False)  # в минутах
    description = Column(String, nullable=True)