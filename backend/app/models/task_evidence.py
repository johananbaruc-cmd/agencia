from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class TaskEvidence(Base):
    __tablename__ = "task_evidence"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    
    # Información del archivo
    file_name = Column(String(500), nullable=False)
    file_url = Column(String(1000), nullable=False)
    file_type = Column(String(100), nullable=True)  # image, video, document, audio
    file_size = Column(BigInteger, nullable=True)
    comment = Column(Text, nullable=True)  # Comentario del empleado al subir
    
    # ✅ Estado de aprobación (pendiente, aprobado, rechazado)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    
    # ✅ Quién revisó y cuándo
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # ✅ Comentario del admin al rechazar
    review_comment = Column(Text, nullable=True)
    
    # ✅ Fecha de entrega de la evidencia (cuando el empleado la sube)
    delivery_date = Column(DateTime(timezone=True), nullable=True)
    
    # ✅ Quién subió la evidencia
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    task = relationship("Task", back_populates="evidence")
    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="uploaded_evidence")
    reviewer = relationship("User", foreign_keys=[reviewed_by])