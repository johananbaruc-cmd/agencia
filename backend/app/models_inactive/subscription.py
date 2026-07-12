from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    stripe_customer_id = Column(String(200), unique=True, nullable=True)
    stripe_subscription_id = Column(String(200), unique=True, nullable=True)
    plan = Column(String(50), default="pro")  # pro: $799 MXN
    status = Column(String(50), default="active")  # active, cancelled, past_due
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False)
    agency = relationship("Agency", back_populates="subscriptions")