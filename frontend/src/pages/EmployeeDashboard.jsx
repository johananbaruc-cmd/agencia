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

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const fetchMyProjects = async () => {
    try {
      const response = await api.get('/employee/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error:', error);
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
                      <div className="project-description" style={{ 
                        color: '#94a3b8', 
                        fontSize: '0.85rem',
                        marginTop: '4px'
                      }}>
                        {project.description}
                      </div>
                    )}

                    <div className="project-meta" style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      marginTop: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {/* Badge de estado */}
                      <span 
                        className="status-badge"
                        style={{ 
                          backgroundColor: getStatusColor(project.status),
                          color: 'white',
                          padding: '2px 12px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        {getStatusText(project.status)}
                      </span>

                      {project.client_name && (
                        <span style={{ 
                          color: '#94a3b8', 
                          fontSize: '0.7rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
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