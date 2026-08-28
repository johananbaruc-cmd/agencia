# app/models/analisis.py

from sqlalchemy import (
    Column, Integer, String, DateTime, Boolean, JSON, 
    Float, Index, BigInteger
)
from sqlalchemy.sql import func
from app.core.database import Base


class AnalisisDashboard(Base):
    """
    Modelo para almacenar los resultados del dashboard de análisis
    """
    __tablename__ = "analisis_dashboard"

    # ==========================================
    # IDENTIFICACIÓN
    # ==========================================
    id = Column(Integer, primary_key=True, index=True)

    # ==========================================
    # KPIs
    # ==========================================
    total_proyectos = Column(Integer, default=0)
    total_empleados = Column(Integer, default=0)
    total_clientes = Column(Integer, default=0)
    tareas_pendientes = Column(Integer, default=0)
    tareas_completadas = Column(Integer, default=0)
    proyectos_activos = Column(Integer, default=0)
    horas_totales = Column(Integer, default=0)

    # ==========================================
    # DATOS PARA GRÁFICAS (JSON)
    # ==========================================
    proyectos_por_estado = Column(JSON, default=[])
    tareas_por_prioridad = Column(JSON, default=[])
    tareas_por_proyecto = Column(JSON, default=[])
    horas_diarias = Column(JSON, default=[])
    prediccion_horas = Column(JSON, default=[])
    carga_empleados = Column(JSON, default=[])
    proyectos_riesgo = Column(JSON, default=[])
    top_clientes = Column(JSON, default=[])
    clientes_industria = Column(JSON, default=[])
    eficiencia_proyectos = Column(JSON, default=[])

    # ==========================================
    # METADATOS
    # ==========================================
    agencia_id = Column(Integer, nullable=True)
    es_actual = Column(Boolean, default=True)
    tiempo_calculo_ms = Column(Integer, nullable=True)

    # ==========================================
    # CONTROL
    # ==========================================
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())

    # ==========================================
    # ÍNDICES
    # ==========================================
    __table_args__ = (
        Index("idx_analisis_agencia_actual", "agencia_id", "es_actual"),
        Index("idx_analisis_creado_en", "creado_en"),
    )

    def to_response(self) -> dict:
        """
        Convierte el modelo a la respuesta que espera el frontend
        """
        return {
            "kpis": {
                "totalProyectos": self.total_proyectos,
                "totalEmpleados": self.total_empleados,
                "totalClientes": self.total_clientes,
                "tareasPendientes": self.tareas_pendientes,
                "tareasCompletadas": self.tareas_completadas,
                "proyectosActivos": self.proyectos_activos,
                "horasTotales": self.horas_totales,
            },
            "proyectosPorEstado": self.proyectos_por_estado,
            "tareasPorPrioridad": self.tareas_por_prioridad,
            "tareasPorProyecto": self.tareas_por_proyecto,
            "horasDiarias": self.horas_diarias,
            "prediccionHoras": self.prediccion_horas,
            "cargaEmpleados": self.carga_empleados,
            "proyectosRiesgo": self.proyectos_riesgo,
            "topClientes": self.top_clientes,
            "clientesIndustria": self.clientes_industria,
            "eficienciaProyectos": self.eficiencia_proyectos,
            "metadata": {
                "fechaCalculo": self.creado_en.isoformat() if self.creado_en else None,
                "tiempoCalculoMs": self.tiempo_calculo_ms,
                "esActual": self.es_actual,
            },
        }