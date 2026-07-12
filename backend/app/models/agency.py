from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Agency(Base):
    __tablename__ = "agencies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    rfc = Column(String(13), unique=True, nullable=True)
    email = Column(String(200), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    users = relationship("User", back_populates="agency", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="agency", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="agency", cascade="all, delete-orphan")
    # Subscription comentado hasta que exista
    # subscriptions = relationship("Subscription", back_populates="agency")