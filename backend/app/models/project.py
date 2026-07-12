# app/models/project.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    budget = Column(Float, nullable=True, default=0)
    status = Column(String(50), nullable=False, default='pending')  # pending, in_progress, completed, cancelled
    progress = Column(Integer, nullable=False, default=0)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # ❌ ELIMINADO: is_active = Column(Boolean, default=True)
    
    # Relaciones
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    agency = relationship("Agency", back_populates="projects")
    client = relationship("Client", back_populates="projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="project", cascade="all, delete-orphan")