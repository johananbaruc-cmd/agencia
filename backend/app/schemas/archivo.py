from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ============================================
# SCHEMAS BASE
# ============================================
class ArchivoReporteBase(BaseModel):
    nombre_original: str = Field(..., max_length=255)
    tipo_archivo: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = None
    es_grafica: bool = False
    orden: int = 0


class ArchivoReporteCreate(ArchivoReporteBase):
    reporte_id: int


class ArchivoReporteUpdate(BaseModel):
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    activo: Optional[bool] = None


# ============================================
# SCHEMAS DE RESPUESTA
# ============================================
class ArchivoReporteResponse(ArchivoReporteBase):
    id: int
    reporte_id: int
    nombre_guardado: str
    ruta_archivo: str
    tamaño_bytes: Optional[int] = None
    fecha_subida: datetime
    activo: bool
    
    class Config:
        from_attributes = True


# ============================================
# SCHEMAS PARA SUBIDA
# ============================================
class ArchivoSubidaResponse(BaseModel):
    id: int
    nombre_original: str
    nombre_guardado: str
    ruta_archivo: str
    tamaño_bytes: int
    mensaje: str


class ArchivoEliminarResponse(BaseModel):
    id: int
    mensaje: str