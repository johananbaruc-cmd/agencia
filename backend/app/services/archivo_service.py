import os
import shutil
from typing import Optional, List, BinaryIO
from datetime import datetime
import uuid
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.models.archivo_reporte import ArchivoReporte
from app.schemas.archivo import ArchivoReporteCreate, ArchivoReporteUpdate

class ArchivoService:
    """Servicio para manejar archivos de reportes"""
    
    # Configuración
    UPLOAD_DIR = "uploads/reportes"
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS = {
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 
        'ppt', 'pptx', 'txt', 'csv', 'json',
        'png', 'jpg', 'jpeg', 'gif', 'svg'
    }
    
    @classmethod
    def validar_archivo(cls, archivo: UploadFile) -> None:
        """Valida que el archivo sea válido"""
        
        # Validar extensión
        extension = archivo.filename.split('.')[-1].lower()
        if extension not in cls.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de archivo no permitido. Permitidos: {', '.join(cls.ALLOWED_EXTENSIONS)}"
            )
        
        # Validar tamaño (si está disponible)
        archivo.file.seek(0, 2)
        tamaño = archivo.file.tell()
        archivo.file.seek(0)
        
        if tamaño > cls.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Archivo demasiado grande. Máximo: {cls.MAX_FILE_SIZE // (1024*1024)}MB"
            )
    
    @classmethod
    def guardar_archivo(
        cls,
        archivo: UploadFile,
        reporte_id: int,
        db: Session,
        descripcion: Optional[str] = None,
        es_grafica: bool = False
    ) -> ArchivoReporte:
        """
        Guarda un archivo en el servidor y crea el registro en BD
        """
        # Validar archivo
        cls.validar_archivo(archivo)
        
        # Generar nombre único
        extension = archivo.filename.split('.')[-1].lower()
        nombre_guardado = f"{uuid.uuid4().hex}.{extension}"
        
        # Crear directorio
        directorio = os.path.join(cls.UPLOAD_DIR, str(reporte_id))
        os.makedirs(directorio, exist_ok=True)
        
        # Ruta completa
        ruta_completa = os.path.join(directorio, nombre_guardado)
        
        # Guardar archivo
        try:
            with open(ruta_completa, "wb") as buffer:
                shutil.copyfileobj(archivo.file, buffer)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error al guardar el archivo: {str(e)}"
            )
        
        # Obtener tamaño
        tamaño_bytes = os.path.getsize(ruta_completa)
        
        # Crear registro en BD
        archivo_data = ArchivoReporteCreate(
            reporte_id=reporte_id,
            nombre_original=archivo.filename,
            tipo_archivo=extension,
            descripcion=descripcion,
            es_grafica=es_grafica
        )
        
        db_archivo = ArchivoReporte(
            **archivo_data.model_dump(),
            nombre_guardado=nombre_guardado,
            ruta_archivo=ruta_completa,
            tamaño_bytes=tamaño_bytes
        )
        
        db.add(db_archivo)
        db.commit()
        db.refresh(db_archivo)
        
        return db_archivo
    
    @classmethod
    def eliminar_archivo(
        cls,
        archivo_id: int,
        db: Session
    ) -> bool:
        """
        Elimina un archivo del servidor y de la BD
        """
        archivo = db.query(ArchivoReporte).filter(
            ArchivoReporte.id == archivo_id,
            ArchivoReporte.activo == True
        ).first()
        
        if not archivo:
            raise HTTPException(
                status_code=404,
                detail="Archivo no encontrado"
            )
        
        # Eliminar archivo físico
        if os.path.exists(archivo.ruta_archivo):
            try:
                os.remove(archivo.ruta_archivo)
            except Exception as e:
                print(f"Error al eliminar archivo físico: {e}")
        
        # Eliminar registro (soft delete)
        archivo.activo = False
        db.commit()
        
        return True
    
    @classmethod
    def obtener_archivos_reporte(
        cls,
        reporte_id: int,
        db: Session,
        solo_graficas: bool = False
    ) -> List[ArchivoReporte]:
        """
        Obtiene todos los archivos de un reporte
        """
        query = db.query(ArchivoReporte).filter(
            ArchivoReporte.reporte_id == reporte_id,
            ArchivoReporte.activo == True
        )
        
        if solo_graficas:
            query = query.filter(ArchivoReporte.es_grafica == True)
        
        return query.order_by(ArchivoReporte.orden).all()
    
    @classmethod
    def actualizar_archivo(
        cls,
        archivo_id: int,
        datos: ArchivoReporteUpdate,
        db: Session
    ) -> ArchivoReporte:
        """
        Actualiza metadatos de un archivo
        """
        archivo = db.query(ArchivoReporte).filter(
            ArchivoReporte.id == archivo_id,
            ArchivoReporte.activo == True
        ).first()
        
        if not archivo:
            raise HTTPException(
                status_code=404,
                detail="Archivo no encontrado"
            )
        
        for key, value in datos.model_dump(exclude_unset=True).items():
            setattr(archivo, key, value)
        
        db.commit()
        db.refresh(archivo)
        
        return archivo