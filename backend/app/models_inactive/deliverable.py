from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class DeliverableStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    APPROVED = "approved"
    REJECTED = "rejected"

class Deliverable(Base):
    __tablename__ = "deliverables"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)  # S3 URL
    status = Column(Enum(DeliverableStatus), default=DeliverableStatus.DRAFT)
    signature_url = Column(String(500), nullable=True)  # Firma digital
    sent_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    
    project = relationship("Project", back_populates="deliverables")
    task = relationship("Task")
    comments = relationship("DeliverableComment", back_populates="deliverable", cascade="all, delete-orphan")