from app.models.agency import Agency
from app.models.user import User
from app.models.client import Client
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.time_entry import TimeEntry
from app.models.task_evidence import TaskEvidence  # ✅ Cambiado de Task_evidence a TaskEvidence

from app.models.reporte import ReporteProyecto
from app.models.archivo_reporte import ArchivoReporte
from app.models.analisis_reporte import AnalisisReporte
from app.models.interaccion_cliente import InteraccionCliente
from app.models.metrica_proyecto import MetricaProyecto