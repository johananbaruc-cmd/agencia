# app/models/analisis_reporte.py

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, JSON, 
    ForeignKey, Float, Index
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AnalisisReporte(Base):
    """
    Modelo para almacenar análisis realizados sobre los reportes
    """
    __tablename__ = "analisis_reporte"
    
    # ==========================================
    # IDENTIFICACIÓN
    # ==========================================
    id = Column(Integer, primary_key=True, index=True)
    reporte_id = Column(Integer, ForeignKey("reportes_proyecto.id", ondelete="CASCADE"), nullable=False)
    
    tipo_analisis = Column(
        String(50), 
        nullable=False,
        comment="pca, regresion, regresion_gasto_tiempo, regresion_rendimiento_empleado, regresion_presupuesto_plazo, clustering, curva_s, desviacion_plazos, estadisticas, prediccion_fin"
    )
    
    nombre = Column(String(255), nullable=True)
    descripcion = Column(Text, nullable=True)
    
    # ==========================================
    # CONFIGURACIÓN
    # ==========================================
    configuracion = Column(JSON, nullable=False, default={})
    metadata_analisis = Column(JSON, nullable=True, default={})
    
    # ==========================================
    # RESULTADOS
    # ==========================================
    resultados = Column(JSON, nullable=True, default={})
    datos_grafica = Column(JSON, nullable=True, default={})
    
    # ==========================================
    # GRÁFICAS
    # ==========================================
    grafica_principal = Column(Text, nullable=True)
    graficas_adicionales = Column(JSON, nullable=True, default=[])
    
    # ==========================================
    # MÉTRICAS DE CONFIANZA
    # ==========================================
    nivel_riesgo = Column(String(20), nullable=True)
    nivel_confianza = Column(Float, nullable=True)
    alertas = Column(JSON, nullable=True, default=[])
    recomendaciones = Column(JSON, nullable=True, default=[])
    
    # ==========================================
    # METADATOS ESPECÍFICOS
    # ==========================================
    empleado_analizado = Column(String(255), nullable=True)
    variable_dependiente = Column(String(100), nullable=True)
    variables_independientes = Column(JSON, nullable=True, default=[])
    proyecto_id_externo = Column(String(100), nullable=True)
    
    # ==========================================
    # EJECUCIÓN
    # ==========================================
    fecha_ejecucion = Column(DateTime(timezone=True), server_default=func.now())
    tiempo_ejecucion_ms = Column(Integer, nullable=True)
    version_algoritmo = Column(String(20), nullable=True, default="2.0.0")
    
    # ==========================================
    # CONTROL
    # ==========================================
    activo = Column(Boolean, default=True)
    eliminado = Column(Boolean, default=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())
    
    # ==========================================
    # RELACIONES
    # ==========================================
    reporte = relationship("ReporteProyecto", back_populates="analisis")
    
    # ==========================================
    # ÍNDICES - CORREGIDOS
    # ==========================================
    __table_args__ = (
        Index('idx_analisis_reporte_tipo_activo', 'tipo_analisis', 'activo'),
        Index('idx_analisis_reporte_reporte_tipo', 'reporte_id', 'tipo_analisis'),  # ✅ CORREGIDO
        Index('idx_analisis_reporte_empleado', 'empleado_analizado', 'activo'),
        Index('idx_analisis_reporte_fecha', 'fecha_ejecucion'),
    )