# create_all_tasks.py
import requests
import time
import json
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# ===== CONFIGURACIÓN =====
API_BASE_URL = "http://localhost:8000"
API_URL_LOGIN = f"{API_BASE_URL}/api/v1/auth/login"  # ✅ Endpoint corregido
API_URL_TASKS = f"{API_BASE_URL}/api/v1/tasks"       # ✅ Endpoint de tareas

# Credenciales de login
LOGIN_EMAIL = "admin@prueba.com"
LOGIN_PASSWORD = "Admin123456"

# ===== FUNCIÓN DE LOGIN =====
def login():
    """Iniciar sesión y obtener token"""
    print("🔐 Iniciando sesión...")
    print(f"📧 Email: {LOGIN_EMAIL}")
    print(f"🌐 URL: {API_URL_LOGIN}")
    print("=" * 60)
    
    login_data = {
        "email": LOGIN_EMAIL,
        "password": LOGIN_PASSWORD
    }
    
    try:
        response = requests.post(API_URL_LOGIN, json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            print(f"📦 Respuesta del login: {json.dumps(data, indent=2)}")
            
            # Intenta obtener el token de diferentes formas
            token = (
                data.get("access_token") or 
                data.get("token") or 
                data.get("data", {}).get("token") or
                data.get("accessToken")
            )
            
            if token:
                print("✅ Login exitoso!")
                print(f"🔑 Token obtenido: {token[:30]}...")
                return token
            else:
                print("❌ Login exitoso pero no se encontró token en la respuesta")
                print(f"   Campos disponibles: {list(data.keys())}")
                return None
        else:
            print(f"❌ Error en login: {response.status_code}")
            print(f"📦 Respuesta: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error en login: {str(e)}")
        return None

# ===== TODAS LAS TAREAS =====
tasks = [
    # ============================================
    # PROYECTO 12 - Sistema de Gestión Financiera
    # ============================================
    {
        "title": "Diseñar arquitectura de base de datos financiera",
        "description": "Crear modelo de datos para transacciones, cuentas y conciliación bancaria",
        "priority": "high",
        "status": "in_progress",
        "project_id": 12,
        "assigned_to": 21,
        "due_date": "2026-09-15T18:00:00Z"
    },
    {
        "title": "Desarrollar módulo de facturación electrónica",
        "description": "Implementar sistema de facturación con integración SAT y timbrado",
        "priority": "high",
        "status": "pending",
        "project_id": 12,
        "assigned_to": 19,
        "due_date": "2026-10-01T18:00:00Z"
    },
    {
        "title": "Implementar dashboard financiero",
        "description": "Crear visualizaciones de KPIs financieros, flujo de caja y balances",
        "priority": "medium",
        "status": "pending",
        "project_id": 12,
        "assigned_to": 20,
        "due_date": "2026-10-15T18:00:00Z"
    },
    {
        "title": "Sistema de conciliación bancaria automática",
        "description": "Integración con APIs bancarias para conciliación automática de movimientos",
        "priority": "medium",
        "status": "pending",
        "project_id": 12,
        "assigned_to": 22,
        "due_date": "2026-11-01T18:00:00Z"
    },

    # ============================================
    # PROYECTO 13 - Gestión de Pólizas y Reclamaciones
    # ============================================
    {
        "title": "Modelar sistema de pólizas de seguros",
        "description": "Diseñar estructura de datos para diferentes tipos de pólizas y coberturas",
        "priority": "high",
        "status": "in_progress",
        "project_id": 13,
        "assigned_to": 23,
        "due_date": "2026-09-01T18:00:00Z"
    },
    {
        "title": "Desarrollar flujo de reclamaciones",
        "description": "Sistema de gestión de reclamaciones con aprobaciones y seguimiento",
        "priority": "high",
        "status": "pending",
        "project_id": 13,
        "assigned_to": 24,
        "due_date": "2026-09-20T18:00:00Z"
    },
    {
        "title": "Calculadora automática de primas",
        "description": "Algoritmo para cálculo de primas basado en perfil de riesgo y coberturas",
        "priority": "medium",
        "status": "pending",
        "project_id": 13,
        "assigned_to": 20,
        "due_date": "2026-10-05T18:00:00Z"
    },
    {
        "title": "Panel de control de siniestros",
        "description": "Dashboard para monitoreo de reclamaciones, tiempos de respuesta y montos",
        "priority": "low",
        "status": "pending",
        "project_id": 13,
        "assigned_to": 25,
        "due_date": "2026-10-25T18:00:00Z"
    },

    # ============================================
    # PROYECTO 14 - Dashboard de Monitoreo Energético
    # ============================================
    {
        "title": "Configurar IoT para paneles solares",
        "description": "Implementar conectividad con sensores de paneles solares y medidores de consumo",
        "priority": "high",
        "status": "in_progress",
        "project_id": 14,
        "assigned_to": 21,
        "due_date": "2026-10-15T18:00:00Z"
    },
    {
        "title": "Desarrollar módulo de monitoreo en tiempo real",
        "description": "Sistema de visualización de datos en tiempo real de consumo y generación",
        "priority": "high",
        "status": "pending",
        "project_id": 14,
        "assigned_to": 26,
        "due_date": "2026-11-01T18:00:00Z"
    },
    {
        "title": "Implementar alertas predictivas",
        "description": "Sistema de alertas para mantenimiento preventivo basado en datos históricos",
        "priority": "medium",
        "status": "in_progress",
        "project_id": 14,
        "assigned_to": 27,
        "due_date": "2026-11-20T18:00:00Z"
    },
    {
        "title": "Dashboard de eficiencia energética",
        "description": "Paneles de control con métricas de eficiencia, ahorro y ROI energético",
        "priority": "medium",
        "status": "pending",
        "project_id": 14,
        "assigned_to": 28,
        "due_date": "2026-12-05T18:00:00Z"
    },

    # ============================================
    # PROYECTO 15 - Gestión de Proyectos de Consultoría
    # ============================================
    {
        "title": "Sistema de seguimiento de proyectos",
        "description": "Implementar gestión de proyectos con hitos, entregables y cronogramas",
        "priority": "high",
        "status": "in_progress",
        "project_id": 15,
        "assigned_to": 22,
        "due_date": "2026-09-25T18:00:00Z"
    },
    {
        "title": "Módulo de asignación de recursos",
        "description": "Sistema para asignación de consultores y gestión de capacidad",
        "priority": "high",
        "status": "pending",
        "project_id": 15,
        "assigned_to": 29,
        "due_date": "2026-10-10T18:00:00Z"
    },
    {
        "title": "Generador de reportes ejecutivos",
        "description": "Creación automática de reportes de avance y resultados para clientes",
        "priority": "medium",
        "status": "pending",
        "project_id": 15,
        "assigned_to": 30,
        "due_date": "2026-10-30T18:00:00Z"
    },
    {
        "title": "Dashboard de KPIs de consultoría",
        "description": "Métricas de desempeño de proyectos, satisfacción y rentabilidad",
        "priority": "low",
        "status": "pending",
        "project_id": 15,
        "assigned_to": 31,
        "due_date": "2026-11-15T18:00:00Z"
    },

    # ============================================
    # PROYECTO 16 - Gestión de Inventario
    # ============================================
    {
        "title": "Sistema de control de inventario",
        "description": "Implementar gestión de inventarios con códigos de barras y trazabilidad",
        "priority": "high",
        "status": "in_progress",
        "project_id": 16,
        "assigned_to": 23,
        "due_date": "2026-09-15T18:00:00Z"
    },
    {
        "title": "Integración con proveedores",
        "description": "API para conexión con sistemas de proveedores y gestión de órdenes",
        "priority": "high",
        "status": "pending",
        "project_id": 16,
        "assigned_to": 32,
        "due_date": "2026-10-01T18:00:00Z"
    },
    {
        "title": "Sistema de trazabilidad de productos",
        "description": "Seguimiento de productos desde origen hasta entrega con blockchain",
        "priority": "medium",
        "status": "pending",
        "project_id": 16,
        "assigned_to": 33,
        "due_date": "2026-10-20T18:00:00Z"
    },
    {
        "title": "Dashboard de inventario",
        "description": "Visualización de niveles de stock, rotación y productos críticos",
        "priority": "medium",
        "status": "pending",
        "project_id": 16,
        "assigned_to": 19,
        "due_date": "2026-11-05T18:00:00Z"
    },

    # ============================================
    # PROYECTO 17 - Gestión de Servicio Automotriz
    # ============================================
    {
        "title": "Sistema de gestión de citas",
        "description": "Agendamiento de citas para mantenimiento y reparación de vehículos",
        "priority": "high",
        "status": "in_progress",
        "project_id": 17,
        "assigned_to": 24,
        "due_date": "2026-09-20T18:00:00Z"
    },
    {
        "title": "Historial de mantenimiento de vehículos",
        "description": "Registro completo de servicios, reparaciones y costos por vehículo",
        "priority": "high",
        "status": "pending",
        "project_id": 17,
        "assigned_to": 20,
        "due_date": "2026-10-05T18:00:00Z"
    },
    {
        "title": "Inventario de refacciones",
        "description": "Control de inventario de partes y refacciones con proveedores",
        "priority": "medium",
        "status": "pending",
        "project_id": 17,
        "assigned_to": 21,
        "due_date": "2026-10-25T18:00:00Z"
    },
    {
        "title": "Módulo de facturación automotriz",
        "description": "Facturación de servicios, presupuestos y garantías",
        "priority": "medium",
        "status": "pending",
        "project_id": 17,
        "assigned_to": 22,
        "due_date": "2026-11-10T18:00:00Z"
    },

    # ============================================
    # PROYECTO 18 - Tienda en Línea Omnichannel
    # ============================================
    {
        "title": "Desarrollo de ecommerce",
        "description": "Tienda en línea con carrito, pagos y gestión de pedidos",
        "priority": "high",
        "status": "in_progress",
        "project_id": 18,
        "assigned_to": 25,
        "due_date": "2026-11-01T18:00:00Z"
    },
    {
        "title": "Integración con redes sociales",
        "description": "Ventas directas desde Facebook, Instagram y TikTok Shop",
        "priority": "high",
        "status": "pending",
        "project_id": 18,
        "assigned_to": 23,
        "due_date": "2026-11-20T18:00:00Z"
    },
    {
        "title": "Gestión de tallas y colores",
        "description": "Sistema de inventario por variantes de productos (tallas, colores, tallas)",
        "priority": "medium",
        "status": "in_progress",
        "project_id": 18,
        "assigned_to": 26,
        "due_date": "2026-12-05T18:00:00Z"
    },
    {
        "title": "Sistema de envíos y logística",
        "description": "Integración con paqueterías, tracking y gestión de entregas",
        "priority": "medium",
        "status": "pending",
        "project_id": 18,
        "assigned_to": 27,
        "due_date": "2026-12-20T18:00:00Z"
    },

    # ============================================
    # PROYECTO 19 - Gestión de Redes y Facturación
    # ============================================
    {
        "title": "Monitoreo de infraestructura de red",
        "description": "Sistema de monitoreo de equipos de red, servidores y servicios",
        "priority": "high",
        "status": "in_progress",
        "project_id": 19,
        "assigned_to": 26,
        "due_date": "2026-11-15T18:00:00Z"
    },
    {
        "title": "Sistema de facturación de servicios",
        "description": "Facturación automática por uso de red, ancho de banda y servicios",
        "priority": "high",
        "status": "pending",
        "project_id": 19,
        "assigned_to": 28,
        "due_date": "2026-12-01T18:00:00Z"
    },
    {
        "title": "Panel de control de red",
        "description": "Dashboard de rendimiento de red, tráfico y disponibilidad",
        "priority": "medium",
        "status": "pending",
        "project_id": 19,
        "assigned_to": 29,
        "due_date": "2026-12-20T18:00:00Z"
    },
    {
        "title": "Sistema de alertas de red",
        "description": "Alertas automáticas por caídas, saturación y problemas de red",
        "priority": "medium",
        "status": "pending",
        "project_id": 19,
        "assigned_to": 30,
        "due_date": "2027-01-10T18:00:00Z"
    },

    # ============================================
    # PROYECTO 20 - Sistema POS Farmacia
    # ============================================
    {
        "title": "Desarrollo de punto de venta POS",
        "description": "Sistema de punto de venta con lectores de código de barras y ticket",
        "priority": "high",
        "status": "in_progress",
        "project_id": 20,
        "assigned_to": 27,
        "due_date": "2026-10-10T18:00:00Z"
    },
    {
        "title": "Control de inventario de medicamentos",
        "description": "Gestión de medicamentos con lote, fecha de caducidad y control de temperatura",
        "priority": "high",
        "status": "pending",
        "project_id": 20,
        "assigned_to": 31,
        "due_date": "2026-10-30T18:00:00Z"
    },
    {
        "title": "Sistema de recetas médicas",
        "description": "Gestión de recetas, validación y registro de medicamentos controlados",
        "priority": "medium",
        "status": "pending",
        "project_id": 20,
        "assigned_to": 32,
        "due_date": "2026-11-15T18:00:00Z"
    },
    {
        "title": "Módulo de promociones y descuentos",
        "description": "Sistema de promociones, descuentos por membresía y campañas",
        "priority": "low",
        "status": "pending",
        "project_id": 20,
        "assigned_to": 33,
        "due_date": "2026-12-01T18:00:00Z"
    },

    # ============================================
    # PROYECTO 21 - Gestión de Proyectos Construcción
    # ============================================
    {
        "title": "Sistema de gestión de obras",
        "description": "Seguimiento de proyectos de construcción, etapas y cronogramas",
        "priority": "high",
        "status": "in_progress",
        "project_id": 21,
        "assigned_to": 28,
        "due_date": "2026-09-20T18:00:00Z"
    },
    {
        "title": "Control de costos y presupuestos",
        "description": "Sistema de gestión financiera para proyectos de construcción",
        "priority": "high",
        "status": "pending",
        "project_id": 21,
        "assigned_to": 19,
        "due_date": "2026-10-15T18:00:00Z"
    },
    {
        "title": "Programación de tareas y recursos",
        "description": "Asignación de maquinaria, personal y materiales por obra",
        "priority": "medium",
        "status": "pending",
        "project_id": 21,
        "assigned_to": 20,
        "due_date": "2026-11-01T18:00:00Z"
    },
    {
        "title": "Sistema de documentación de obra",
        "description": "Gestión de planos, permisos, licencias y documentación legal",
        "priority": "medium",
        "status": "pending",
        "project_id": 21,
        "assigned_to": 21,
        "due_date": "2026-11-20T18:00:00Z"
    },

    # ============================================
    # PROYECTO 22 - Plataforma E-Learning
    # ============================================
    {
        "title": "Desarrollo de plataforma educativa",
        "description": "Sistema de cursos en línea con lecciones, videos y ejercicios interactivos",
        "priority": "high",
        "status": "in_progress",
        "project_id": 22,
        "assigned_to": 29,
        "due_date": "2026-11-01T18:00:00Z"
    },
    {
        "title": "Sistema de evaluaciones",
        "description": "Creación de exámenes, cuestionarios y sistema de calificaciones",
        "priority": "high",
        "status": "pending",
        "project_id": 22,
        "assigned_to": 22,
        "due_date": "2026-11-20T18:00:00Z"
    },
    {
        "title": "Seguimiento de estudiantes",
        "description": "Dashboard de progreso, estadísticas y reportes de estudiantes",
        "priority": "medium",
        "status": "pending",
        "project_id": 22,
        "assigned_to": 23,
        "due_date": "2026-12-10T18:00:00Z"
    },
    {
        "title": "Sistema de certificaciones",
        "description": "Generación automática de certificados de finalización de cursos",
        "priority": "low",
        "status": "pending",
        "project_id": 22,
        "assigned_to": 24,
        "due_date": "2027-01-10T18:00:00Z"
    },

    # ============================================
    # PROYECTO 23 - Gestión de Proyectos Energía
    # ============================================
    {
        "title": "Sistema de proyectos de eficiencia energética",
        "description": "Gestión de proyectos de ahorro energético y auditorías",
        "priority": "high",
        "status": "in_progress",
        "project_id": 23,
        "assigned_to": 30,
        "due_date": "2026-10-20T18:00:00Z"
    },
    {
        "title": "Módulo de auditorías energéticas",
        "description": "Sistema para realización de auditorías de consumo y eficiencia",
        "priority": "high",
        "status": "pending",
        "project_id": 23,
        "assigned_to": 25,
        "due_date": "2026-11-15T18:00:00Z"
    },
    {
        "title": "Medición de impacto ambiental",
        "description": "Cálculo de reducción de huella de carbono y beneficios ambientales",
        "priority": "medium",
        "status": "pending",
        "project_id": 23,
        "assigned_to": 26,
        "due_date": "2026-12-05T18:00:00Z"
    },
    {
        "title": "Dashboard de ahorro energético",
        "description": "Visualización de ahorros, ROI y métricas de eficiencia",
        "priority": "medium",
        "status": "pending",
        "project_id": 23,
        "assigned_to": 27,
        "due_date": "2027-01-15T18:00:00Z"
    },

    # ============================================
    # PROYECTO 24 - Gestión Hotelera
    # ============================================
    {
        "title": "Sistema de reservaciones",
        "description": "Motor de reservaciones con disponibilidad en tiempo real y precios dinámicos",
        "priority": "high",
        "status": "in_progress",
        "project_id": 24,
        "assigned_to": 31,
        "due_date": "2026-09-25T18:00:00Z"
    },
    {
        "title": "Módulo de check-in/out",
        "description": "Sistema de registro de huéspedes, asignación de habitaciones y pagos",
        "priority": "high",
        "status": "pending",
        "project_id": 24,
        "assigned_to": 28,
        "due_date": "2026-10-15T18:00:00Z"
    },
    {
        "title": "CRM para hoteles",
        "description": "Gestión de clientes, preferencias y marketing personalizado",
        "priority": "medium",
        "status": "pending",
        "project_id": 24,
        "assigned_to": 29,
        "due_date": "2026-11-05T18:00:00Z"
    },
    {
        "title": "Sistema de facturación hotelera",
        "description": "Facturación de servicios, extras y paquetes turísticos",
        "priority": "medium",
        "status": "pending",
        "project_id": 24,
        "assigned_to": 30,
        "due_date": "2026-11-25T18:00:00Z"
    },

    # ============================================
    # PROYECTO 25 - Automatización de Marketing
    # ============================================
    {
        "title": "Sistema de marketing automation",
        "description": "Plataforma de automatización con workflows, campañas y segmentación",
        "priority": "high",
        "status": "in_progress",
        "project_id": 25,
        "assigned_to": 32,
        "due_date": "2026-10-25T18:00:00Z"
    },
    {
        "title": "Gestión de leads",
        "description": "Captura, calificación y seguimiento de leads en embudo de ventas",
        "priority": "high",
        "status": "pending",
        "project_id": 25,
        "assigned_to": 19,
        "due_date": "2026-11-15T18:00:00Z"
    },
    {
        "title": "Analytics y reportes de marketing",
        "description": "Dashboard de métricas de campañas, ROI y conversión",
        "priority": "medium",
        "status": "pending",
        "project_id": 25,
        "assigned_to": 20,
        "due_date": "2026-12-05T18:00:00Z"
    },
    {
        "title": "Integración con canales digitales",
        "description": "Conexión con redes sociales, email marketing y anuncios",
        "priority": "medium",
        "status": "pending",
        "project_id": 25,
        "assigned_to": 21,
        "due_date": "2027-01-15T18:00:00Z"
    },

    # ============================================
    # PROYECTO 26 - Monitoreo de Seguridad
    # ============================================
    {
        "title": "Sistema de monitoreo de cámaras",
        "description": "Plataforma de monitoreo de cámaras con detección de movimiento e IA",
        "priority": "high",
        "status": "in_progress",
        "project_id": 26,
        "assigned_to": 33,
        "due_date": "2026-11-01T18:00:00Z"
    },
    {
        "title": "Control de acceso",
        "description": "Sistema de control de acceso con biometrics, tarjetas y QR",
        "priority": "high",
        "status": "pending",
        "project_id": 26,
        "assigned_to": 22,
        "due_date": "2026-11-20T18:00:00Z"
    },
    {
        "title": "Sistema de gestión de incidentes",
        "description": "Registro, seguimiento y escalamiento de incidentes de seguridad",
        "priority": "medium",
        "status": "pending",
        "project_id": 26,
        "assigned_to": 23,
        "due_date": "2026-12-10T18:00:00Z"
    },
    {
        "title": "Panel de control de seguridad",
        "description": "Dashboard unificado con todas las cámaras, alarmas y accesos",
        "priority": "medium",
        "status": "pending",
        "project_id": 26,
        "assigned_to": 24,
        "due_date": "2027-01-20T18:00:00Z"
    }
]

# ===== FUNCIÓN PRINCIPAL =====
def create_all_tasks():
    """Crear todas las tareas en la API"""
    
    # 1. Primero hacer login
    token = login()
    
    if not token:
        print("\n❌ No se pudo obtener token. Verifica tus credenciales.")
        print("   Credenciales usadas:")
        print(f"   Email: {LOGIN_EMAIL}")
        print(f"   Password: {LOGIN_PASSWORD}")
        return 0, len(tasks)
    
    # 2. Configurar headers con token
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    print("\n" + "=" * 60)
    print("🚀 Creando 60 tareas...")
    print("=" * 60)
    print(f"📡 API URL: {API_URL_TASKS}")
    print("=" * 60 + "\n")
    
    success = 0
    errors = 0
    
    for i, task in enumerate(tasks, 1):
        try:
            response = requests.post(API_URL_TASKS, json=task, headers=headers)
            
            if response.status_code in [200, 201]:
                print(f"✅ {i:2d}/60 - {task['title'][:40]}... ({task['status']})")
                success += 1
            else:
                print(f"❌ {i:2d}/60 - Error {response.status_code}: {task['title'][:30]}...")
                print(f"   Respuesta: {response.text[:100]}")
                errors += 1
                
                # Si da 401, el token expiró o es inválido
                if response.status_code == 401:
                    print("   ⚠️ Token inválido. Deteniendo ejecución.")
                    break
            
            # Pausa para no saturar el servidor
            time.sleep(0.15)
            
        except requests.exceptions.ConnectionError:
            print(f"❌ {i:2d}/60 - Error de conexión: ¿El servidor está corriendo?")
            errors += 1
        except Exception as e:
            print(f"❌ {i:2d}/60 - Error: {str(e)[:50]}")
            errors += 1
    
    # ===== RESUMEN FINAL =====
    print("\n" + "=" * 60)
    print("📊 RESUMEN FINAL")
    print("=" * 60)
    print(f"✅ Tareas creadas: {success}")
    print(f"❌ Tareas con error: {errors}")
    print(f"📝 Total: {len(tasks)}")
    print("=" * 60)
    
    if success == len(tasks):
        print("🎉 ¡TODAS LAS TAREAS FUERON CREADAS EXITOSAMENTE!")
    elif success > 0:
        print(f"⚠️ Se crearon {success} de {len(tasks)} tareas.")
    else:
        print("❌ No se pudo crear ninguna tarea.")
    
    return success, errors

# ===== EJECUTAR =====
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("   SCRIPT DE CREACIÓN MASIVA DE TAREAS")
    print("=" * 60 + "\n")
    
    # Verificar que requests está instalado
    try:
        import requests
    except ImportError:
        print("❌ Error: No tienes instalado 'requests'")
        print("   Instálalo con: pip install requests")
        exit(1)
    
    # Ejecutar
    create_all_tasks()