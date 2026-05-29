import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { FolderOpen, Clock, CheckCircle, DollarSign, Plus, LayoutGrid, List } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/');
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
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  const projectsByStatus = {
    pending: projects.filter(p => p.status === 'pending'),
    in_progress: projects.filter(p => p.status === 'in_progress'),
    completed: projects.filter(p => p.status === 'completed'),
  };

  return (
    <>
      <Navbar />

      <div className="dashboard-container">

        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-title">
              <h1>Dashboard</h1>
              <p>Bienvenido, {user?.name}</p>
            </div>

         
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Total Proyectos</span>
              <FolderOpen size={18} />
            </div>
            <div className="stat-card-value">{stats.total}</div>
            <div className="stat-card-sub">Proyectos registrados</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">En Progreso</span>
              <Clock size={18} />
            </div>
            <div className="stat-card-value">{stats.inProgress}</div>
            <div className="stat-card-sub">Activos actualmente</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Completados</span>
              <CheckCircle size={18} />
            </div>
            <div className="stat-card-value">{stats.completed}</div>
            <div className="stat-card-sub">Finalizados</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Presupuesto</span>
              <DollarSign size={18} />
            </div>
            <div className="stat-card-value">
              ${stats.totalBudget.toLocaleString('es-MX')}
            </div>
            <div className="stat-card-sub">MXN</div>
          </div>

        </div>

        {/* PROYECTOS */}
        <div className="projects-section">

          <div className="projects-header">
            <div className="projects-title">
              Mis Proyectos <span>({projects.length})</span>
            </div>

            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={16} />
               
              </button>

              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
              
              </button>
            </div>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando proyectos...</p>
            </div>

          ) : projects.length === 0 ? (

            /* EMPTY */
            <div className="empty-state">
              <FolderOpen size={40} />
              <p className="empty-title">No hay proyectos</p>
              <p className="empty-subtitle">Crea tu primer proyecto</p>
            </div>

          ) : viewMode === 'grid' ? (

            /* KANBAN */
            <div className="kanban-container">

              {[
                { key: 'pending', title: '📋 Pendiente' },
                { key: 'in_progress', title: '🔄 En Progreso' },
                { key: 'completed', title: '✅ Completado' }
              ].map(col => (
                <div key={col.key} className="kanban-column">

                  <div className="kanban-column-header">
                    <span className="kanban-column-title">
                      {col.title}
                    </span>
                    <span className="column-count">
                      {projectsByStatus[col.key].length}
                    </span>
                  </div>

                  {projectsByStatus[col.key].map(project => (
                    <div 
                      key={project.id}
                      className="project-card"
                      onClick={() => window.location.href = `/projects/${project.id}`}
                    >
                      <div className="project-card-title">{project.name}</div>

                      {project.description && (
                        <div className="project-card-description">
                          {project.description}
                        </div>
                      )}

                      {col.key !== 'completed' && (
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      )}

                      <div className="project-card-footer">
                        <span>
                          ${project.budget?.toLocaleString('es-MX')}
                        </span>
                        {col.key !== 'completed' && (
                          <span>{project.progress || 0}%</span>
                        )}
                      </div>
                    </div>
                  ))}

                </div>
              ))}

            </div>

          ) : (

            /* LISTA */
            <div className="projects-list">
              {projects.map(project => (
                <div 
                  key={project.id}
                  className="project-list-item"
                  onClick={() => window.location.href = `/projects/${project.id}`}
                >
                  <div>
                    <div className="project-name">{project.name}</div>
                    <div className="project-meta">
                      ${project.budget?.toLocaleString('es-MX')} • {project.progress || 0}%
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