import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { FolderOpen, Clock, CheckCircle } from 'lucide-react';
import './EmployeeDashboard.css';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const fetchMyProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/employee/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
      setError('Error al cargar tus proyectos');
      
      try {
        const fallbackResponse = await api.get('/projects/');
        const userProjects = fallbackResponse.data.filter(project => 
          project.members?.some(m => m.user_id === user?.id)
        );
        setProjects(userProjects);
      } catch (fallbackError) {
        console.error('Error en fallback:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  const getStatusText = (status) => {
    const map = {
      pending: 'Pendiente',
      in_progress: 'En Desarrollo',
      completed: 'Finalizado',
      cancelled: 'Cancelado'
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      completed: '#10b981',
      cancelled: '#ef4444'
    };
    return map[status] || '#6b7280';
  };

  return (
    <>
      <Navbar />

      {/* ===== FONDO ULTRA LIGERO (ORBES AZULES) ===== */}
      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

      <div className="employee-dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-title">
              <h1>Mis Proyectos</h1>
              <p>Bienvenido, {user?.name}</p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Total Proyectos</span>
              <FolderOpen size={18} />
            </div>
            <div className="stat-card-value">{stats.total}</div>
            <div className="stat-card-sub">Proyectos asignados</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">En Desarrollo</span>
              <Clock size={18} />
            </div>
            <div className="stat-card-value">{stats.inProgress}</div>
            <div className="stat-card-sub">Activos actualmente</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Finalizados</span>
              <CheckCircle size={18} />
            </div>
            <div className="stat-card-value">{stats.completed}</div>
            <div className="stat-card-sub">Completados</div>
          </div>
        </div>

        {/* Lista de proyectos */}
        <div className="projects-section">
          <div className="projects-header">
            <div className="projects-title">
              Mis Proyectos <span>({projects.length})</span>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando proyectos...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p className="error-title">{error}</p>
              <button className="btn-retry" onClick={fetchMyProjects}>
                Reintentar
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={40} />
              <p className="empty-title">No hay proyectos asignados</p>
              <p className="empty-subtitle">Cuando te asignen un proyecto, aparecerá aquí</p>
            </div>
          ) : (
            <div className="projects-list">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="project-list-item"
                >
                  <div className="project-info">
                    <div className="project-name">
                      {project.name}
                    </div>
                    
                    {project.description && (
                      <div className="project-description">
                        {project.description}
                      </div>
                    )}

                    <div className="project-meta">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(project.status) }}
                      >
                        {getStatusText(project.status)}
                      </span>

                      {project.client_name && (
                        <span className="client-name">
                          Cliente: {project.client_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}