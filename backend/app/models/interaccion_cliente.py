from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class InteraccionCliente(Base):
    __tablename__ = "interaccion_cliente"
    
    id = Column(Integer, primary_key=True, index=True)
    reporte_id = Column(Integer, ForeignKey("reportes_proyecto.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clients.id"), nullable=True)  # NULL si el cliente no tiene cuenta
    
    # Datos de la visita
    ip_cliente = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    sesion_id = Column(String(255), nullable=True)
    fecha_visto = Column(DateTime(timezone=True), server_default=func.now())
    
    # Comportamiento
    tiempo_visto_segundos = Column(Integer, nullable=True)
    scroll_porcentaje = Column(Integer, default=0)
    archivos_descargados = Column(JSON, nullable=True)  # Array de IDs de archivos descargados
    
    # Respuestas
    respuesta_pregunta = Column(Text, nullable=True)
    respuesta_boolean = Column(Boolean, nullable=True)
    comentarios = Column(Text, nullable=True)
    
    # Control
    activo = Column(Boolean, default=True)
    
    # Relaciones
    reporte = relationship("ReporteProyecto", back_populates="interacciones")
    cliente = relationship("Client", foreign_keys=[cliente_id])