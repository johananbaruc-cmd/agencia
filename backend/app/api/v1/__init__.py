from fastapi import APIRouter
from app.api.v1.endpoints import auth, projects, clients, employees, employee_projects, tasks
from app.api.v1.endpoints import reportes, archivos, analisis, reporte_publico
router = APIRouter(prefix="/v1")

router.include_router(auth.router)
router.include_router(projects.router)
router.include_router(clients.router)
router.include_router(employees.router)
router.include_router(employee_projects.router)
router.include_router(tasks.router) 

router.include_router(reportes.router)
router.include_router(archivos.router)
router.include_router(analisis.router)
router.include_router(reporte_publico.router)