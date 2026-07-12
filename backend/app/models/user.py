from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default='employee')
    profession = Column(String(50), nullable=True)
    hashed_password = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    must_change_password = Column(Boolean, default=True)
    
    # Relaciones
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False)
    agency = relationship("Agency", back_populates="users")
    
    assigned_projects = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    assigned_tasks = relationship("Task", foreign_keys="Task.assigned_to", back_populates="assignee")
    created_tasks = relationship("Task", foreign_keys="Task.created_by", back_populates="creator")
    time_entries = relationship("TimeEntry", back_populates="user")
    uploaded_evidence = relationship("TaskEvidence", foreign_keys="TaskEvidence.uploaded_by", back_populates="uploader")  # ✅ AGREGAR ESTA LÍNEA
    
    def __init__(self, **kwargs):
        """Normalizar rol a minúsculas al crear el usuario"""
        if 'role' in kwargs and kwargs['role']:
            kwargs['role'] = kwargs['role'].lower()
        super().__init__(**kwargs)