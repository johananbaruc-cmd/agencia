# app/schemas/reporte.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import re

# ============================================
# ENUMS
# ============================================
class EstadoReporte(str, Enum):
    BORRADOR = "borrador"
    PUBLICADO = "publicado"
    EXPIRADO = "expirado"

class TipoAnalisis(str, Enum):
    PCA = "pca"
    REGRESION = "regresion"
    CLUSTERING = "clustering"
    ESTADISTICAS = "estadisticas"


# ============================================
# SCHEMAS BASE
# ============================================
class ReporteBase(BaseModel):
    titulo: str = Field(..., max_length=255)
    descripcion: Optional[str] = None
    configuracion_analisis: Optional[Dict[str, Any]] = None
    texto_avance: Optional[str] = None
    pregunta_cliente: Optional[str] = None
    fecha_expiracion: Optional[datetime] = None
    horas_expiracion: Optional[int] = Field(24, ge=1, le=720)  # ✅ 1 a 720 horas



class ReporteCreate(ReporteBase):
    project_id: int
    admin_id: int
    # ❌ ELIMINAR: incluir_evidencias: Optional[bool] = False
    evidencias_ids: Optional[List[int]] = []            # ✅ Se guarda en la BD
    # ❌ ELIMINAR: incluir_archivos_existentes: Optional[bool] = False
    archivos_existentes_ids: Optional[List[int]] = []   # ✅ Se guarda en la BD

class ReporteUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=255)
    descripcion: Optional[str] = None
    configuracion_analisis: Optional[Dict[str, Any]] = None
    texto_avance: Optional[str] = None
    pregunta_cliente: Optional[str] = None
    estado: Optional[EstadoReporte] = None
    fecha_expiracion: Optional[datetime] = None
    activo: Optional[bool] = None
    horas_expiracion: Optional[int] = Field(None, ge=1, le=720)


# ============================================
# SCHEMA PARA VALIDAR CÓDIGO DE ACCESO
# ============================================
class CodigoAccesoValidar(BaseModel):
    codigo_acceso: str = Field(..., description="Código de acceso formato XXXX-XXXX")
    
    @field_validator('codigo_acceso')
    @classmethod
    def validar_formato_codigo(cls, v: str) -> str:
        v = v.strip().upper()
        if '-' not in v and len(v) == 8:
            v = v[:4] + '-' + v[4:]
        if not re.match(r'^[A-Z0-9]{4}-[A-Z0-9]{4}$', v):
            raise ValueError('El código debe tener el formato XXXX-XXXX (8 caracteres alfanuméricos)')
        return v


# ============================================
# SCHEMAS DE RESPUESTA
# ============================================
class ReporteResponse(ReporteBase):
    id: int
    project_id: int
    admin_id: int
    estado: EstadoReporte
    codigo_acceso: str
    enlace_publico: Optional[str] = None
    codigo_qr: Optional[str] = None
    veces_visto: int
    activo: bool
    fecha_generacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    horas_expiracion: Optional[int] = 24
    # ✅ AGREGAR ESTOS CAMPOS
    evidencias_ids: Optional[List[int]] = []
    archivos_existentes_ids: Optional[List[int]] = []
    
    class Config:
        from_attributes = True


class ReporteConDetalles(ReporteResponse):
    archivos: List['ArchivoReporteResponse'] = []
    analisis: List['AnalisisReporteResponse'] = []

    
# ============================================
# SCHEMAS PARA PUBLICAR
# ============================================
class ReportePublicar(BaseModel):
    titulo: str = Field(..., max_length=255)
    descripcion: Optional[str] = None
    texto_avance: Optional[str] = None
    pregunta_cliente: Optional[str] = None
    configuracion_analisis: Optional[Dict[str, Any]] = None
    fecha_expiracion: Optional[datetime] = None
    enviar_correo: bool = False
    correo_cliente: Optional[str] = None
    horas_expiracion: Optional[int] = Field(24, ge=1, le=720)


class ReportePublicadoResponse(BaseModel):
    reporte: ReporteResponse
    codigo_acceso: str
    enlace_publico: str
    codigo_qr: str
    mensaje: str
    horas_expiracion: int


# ============================================
# SCHEMAS PARA CLIENTE (Vista Pública)
# ============================================
class ReportePublicoResponse(BaseModel):
    id: int
    project_id: int
    titulo: str
    descripcion: Optional[str] = None
    texto_avance: Optional[str] = None
    pregunta_cliente: Optional[str] = None
    fecha_generacion: datetime
    fecha_expiracion: Optional[datetime] = None
    horas_expiracion: Optional[int] = 24
    
    proyecto_nombre: str
    proyecto_descripcion: Optional[str] = None
    proyecto_progress: int
    proyecto_status: str
    proyecto_budget: Optional[float] = None
    proyecto_start_date: Optional[datetime] = None
    proyecto_end_date: Optional[datetime] = None
    
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    agency_name: Optional[str] = None
    agency_email: Optional[str] = None
    agency_rfc: Optional[str] = None
    
    total_empleados: int = 0
    
    evidencias_tareas: Optional[List[Dict[str, Any]]] = []
    archivos_existentes: Optional[List[Dict[str, Any]]] = []
    archivos: List['ArchivoReporteResponse'] = []
    analisis: List['AnalisisReporteResponse'] = []
    
    class Config:
        from_attributes = True


# ============================================
# IMPORTAR SCHEMAS DE OTROS MÓDULOS
# ============================================
from app.schemas.archivo import ArchivoReporteResponse
from app.schemas.analisis import AnalisisReporteResponse

ReporteConDetalles.model_rebuild()
ReportePublicoResponse.model_rebuild()