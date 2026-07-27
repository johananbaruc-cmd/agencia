import qrcode
from io import BytesIO
import base64
import os
from typing import Optional
from datetime import datetime

class QRService:
    """Servicio para generar y manejar códigos QR"""
    
    @staticmethod
    def generar_qr(
        data: str,
        tamaño: int = 10,
        borde: int = 4,
        color_fondo: str = "white",
        color_relleno: str = "black"
    ) -> str:
        """
        Genera un código QR y lo devuelve como base64
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=tamaño,
            border=borde,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color=color_relleno, back_color=color_fondo)
        
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def guardar_qr_archivo(
        data: str,
        ruta_destino: str,
        tamaño: int = 10
    ) -> str:
        """
        Genera un QR y lo guarda como archivo
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=tamaño,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        os.makedirs(os.path.dirname(ruta_destino), exist_ok=True)
        
        img.save(ruta_destino, "PNG")
        return ruta_destino
    
    @staticmethod
    def generar_url_completa(
        base_url: str,
        enlace_publico: str
    ) -> str:
        """
        Genera la URL completa para el QR
        """
        base_url = base_url.rstrip('/')
        enlace_publico = enlace_publico.lstrip('/')
        
        return f"{base_url}/acceso/reporte/{enlace_publico}"