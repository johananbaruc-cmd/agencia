from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class AnalisisReporte(Base):
    __tablename__ = "analisis_reporte"
    
    id = Column(Integer, primary_key=True, index=True)
    reporte_id = Column(Integer, ForeignKey("reportes_proyecto.id"), nullable=False)
    
    # Tipo de análisis: 'pca', 'regresion', 'clustering', 'estadisticas'
    tipo_analisis = Column(String(50), nullable=False)
    nombre = Column(String(255), nullable=True)
    descripcion = Column(Text, nullable=True)
    
    # Configuración usada
    configuracion = Column(JSON, nullable=False)
    
    # Resultados
    resultados = Column(JSON, nullable=True)  # Datos numéricos del análisis
    datos_grafica = Column(JSON, nullable=True)  # Datos para gráficas interactivas
    
    # Gráficas generadas
    grafica_principal = Column(Text, nullable=True)  # Ruta de la imagen principal
    graficas_adicionales = Column(JSON, nullable=True)  # Array de rutas de imágenes
    
    # Métricas de ejecución
    fecha_ejecucion = Column(DateTime(timezone=True), server_default=func.now())
    tiempo_ejecucion_ms = Column(Integer, nullable=True)
    
    # Control
    activo = Column(Boolean, default=True)
    
    # Relaciones
    reporte = relationship("ReporteProyecto", back_populates="analisis")