from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class MetricaProyecto(Base):
    __tablename__ = "metricas_proyecto"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    fecha_medicion = Column(Date, nullable=False)
    
    # Métricas principales
    total_empleados = Column(Integer, nullable=True)
    horas_trabajadas = Column(Float, nullable=True)
    productividad = Column(Float, nullable=True)  # Porcentaje
    
    # Métricas financieras
    costo_total = Column(Float, nullable=True)
    costo_por_hora = Column(Float, nullable=True)
    presupuesto_gastado = Column(Float, nullable=True)
    presupuesto_total = Column(Float, nullable=True)
    
    # Métricas de calidad
    calidad_porcentaje = Column(Float, nullable=True)
    satisfaccion_cliente = Column(Float, nullable=True)
    cumplimiento_plazo = Column(Float, nullable=True)
    
    # Métricas de avance
    avance_porcentaje = Column(Float, nullable=True)
    tareas_completadas = Column(Integer, nullable=True)
    tareas_pendientes = Column(Integer, nullable=True)
    
    # Datos adicionales (flexible para futuros análisis)
    datos_extra = Column(JSON, nullable=True)
    
    # Control
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    project = relationship("Project", back_populates="metricas")