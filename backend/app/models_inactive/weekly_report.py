from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    pdf_url = Column(String(500), nullable=False)  # S3 URL
    week_start = Column(DateTime(timezone=True), nullable=False)
    week_end = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    
    project = relationship("Project", back_populates="weekly_reports")