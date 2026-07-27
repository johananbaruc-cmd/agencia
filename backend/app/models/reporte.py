# app/models/reporte.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ReporteProyecto(Base):
    __tablename__ = "reportes_proyecto"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    estado = Column(String(50), nullable=False, default='borrador')
    
    codigo_acceso = Column(String(20), unique=True, nullable=False)
    enlace_publico = Column(String(255), unique=True, nullable=True)
    codigo_qr = Column(Text, nullable=True)
    
    configuracion_analisis = Column(JSON, nullable=True)
    texto_avance = Column(Text, nullable=True)
    pregunta_cliente = Column(Text, nullable=True)
    
    # ✅ EVIDENCIAS
    evidencias_ids = Column(JSON, nullable=True, default=[])
    archivos_existentes_ids = Column(JSON, nullable=True, default=[])
    
    # ✅ EXPIRACIÓN POR HORAS (el admin elige)
    horas_expiracion = Column(Integer, nullable=False, default=24)
    fecha_expiracion = Column(DateTime(timezone=True), nullable=True)
    
    veces_visto = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, default=True)
    
    fecha_generacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    project = relationship("Project", back_populates="reportes")
    admin = relationship("User", foreign_keys=[admin_id])
    archivos = relationship("ArchivoReporte", back_populates="reporte", cascade="all, delete-orphan")
    analisis = relationship("AnalisisReporte", back_populates="reporte", cascade="all, delete-orphan")
    interacciones = relationship("InteraccionCliente", back_populates="reporte", cascade="all, delete-orphan")