from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class TimeEntry(Base):
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    hours = Column(Float, nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=True)
    is_billable = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    user = relationship("User", back_populates="time_entries")
    task = relationship("Task", back_populates="time_entries")  # ✅ YA DEBERÍA EXISTIR
    project = relationship("Project", back_populates="time_entries")