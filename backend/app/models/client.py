from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    company = Column(String(200), nullable=True)
    rfc = Column(String(13), nullable=True)
    magic_link_token = Column(String(500), unique=True, nullable=True)
    magic_link_expires = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False)
    agency = relationship("Agency", back_populates="clients")
    projects = relationship("Project", back_populates="client")
    # Comentar relaciones problemáticas
    # comments = relationship("DeliverableComment", back_populates="client")
