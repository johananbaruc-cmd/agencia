import secrets
import string
from datetime import datetime, timedelta
import hashlib
import base64

class CodigoService:
    """Servicio para generar códigos de acceso y enlaces públicos"""
    
    @staticmethod
    def generar_codigo_acceso(longitud: int = 8) -> str:
        """
        Genera un código de acceso aleatorio
        Ejemplo: "XK7P-9M2L"
        """
        caracteres = string.ascii_uppercase + string.digits
        # Excluir caracteres confusos: 0, O, I, 1, etc.
        caracteres = caracteres.replace('0', '').replace('O', '').replace('I', '').replace('1', '')
        
        parte1 = ''.join(secrets.choice(caracteres) for _ in range(longitud // 2))
        parte2 = ''.join(secrets.choice(caracteres) for _ in range(longitud // 2))
        
        return f"{parte1}-{parte2}"
    
    @staticmethod
    def generar_enlace_publico(project_id: int, reporte_id: int) -> str:
        """
        Genera un enlace público único basado en project_id y reporte_id
        RETORNA SOLO EL HASH (sin prefijos)
        """
        # Combinar IDs y generar hash
        seed = f"{project_id}-{reporte_id}-{datetime.now().isoformat()}"
        hash_obj = hashlib.sha256(seed.encode())
        hash_hex = hash_obj.hexdigest()[:16]
        
        return hash_hex  # Solo el hash, sin "/reporte/"
    
    @staticmethod
    def generar_codigo_qr(contenido: str) -> str:
        """
        Genera un código QR en formato base64
        """
        import qrcode
        from io import BytesIO
        import base64
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(contenido)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convertir a base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    @staticmethod
    def generar_token_unico() -> str:
        """
        Genera un token único para el enlace público
        """
        return secrets.token_urlsafe(16)