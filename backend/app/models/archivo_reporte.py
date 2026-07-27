from sqlalchemy import Column, Integer, String, Text, Boolean, BigInteger, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class ArchivoReporte(Base):
    __tablename__ = "archivos_reporte"
    
    id = Column(Integer, primary_key=True, index=True)
    reporte_id = Column(Integer, ForeignKey("reportes_proyecto.id"), nullable=False)
    
    # Información del archivo
    nombre_original = Column(String(255), nullable=False)
    nombre_guardado = Column(String(255), nullable=False)  # Nombre único en el servidor
    ruta_archivo = Column(Text, nullable=False)
    tipo_archivo = Column(String(100), nullable=True)
    tamaño_bytes = Column(BigInteger, nullable=True)
    
    # Metadatos
    es_grafica = Column(Boolean, default=False)
    descripcion = Column(Text, nullable=True)
    orden = Column(Integer, default=0)
    
    # Control
    activo = Column(Boolean, default=True)
    fecha_subida = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    reporte = relationship("ReporteProyecto", back_populates="archivos")