import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import KanbanBoard from '../components/KanbanBoard';
import { 
  FolderOpen, 
  LayoutGrid, 
  List, 
  X, 
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Search,
  Wallet,
  CheckCircle2,
  Clock,
  TrendingUp
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const [showStats, setShowStats] = useState(false);
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(viewParam === 'kanban' ? 'kanban' : 'grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    budget: '',
  });

  const toggleStats = () => {
    setShowStats(!showStats);
  };

  useEffect(() => {
    if (viewParam === 'kanban') {
      setViewMode('kanban');
    } else if (viewParam === 'scrum') {
      setViewMode('grid');
    }
  }, [viewParam]);

  useEffect(() => {
    fetchProjects();
  }, []);

  // ACTUALIZACIÓN AUTOMÁTICA CADA 10 SEGUNDOS
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProjects();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // ACTUALIZACIÓN AL VOLVER A LA PÁGINA (focus)
  useEffect(() => {
    window.addEventListener('focus', fetchProjects);
    return () => window.removeEventListener('focus', fetchProjects);
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

  const refreshProjects = async () => {
    try {
      const response = await api.get('/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error refrescando proyectos:', error);
    }
  };

  // Filtrar proyectos según el término de búsqueda
  const filteredProjects = projects.filter((project) => {
    const term = searchTerm.toLowerCase();
    return (
      project.name?.toLowerCase().includes(term) ||
      project.client_name?.toLowerCase().includes(term) ||
      project.status?.toLowerCase().includes(term) ||
      project.description?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  const handleProjectClick = (project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleEditClick = (project) => {
    setEditingProject(project);
    setEditFormData({
      name: project.name,
      description: project.description || '',
      budget: project.budget,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/projects/${editingProject.id}`, {
        name: editFormData.name,
        description: editFormData.description,
        budget: parseFloat(editFormData.budget),
      });
      setShowEditModal(false);
      setEditingProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar el proyecto');
    }
  };

  const openDeleteModal = (projectId, projectName) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null);
    setDeleting(false);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectToDelete.id}`);
      closeDeleteModal();
      fetchProjects();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el proyecto');
      setDeleting(false);
    }
  };

  const toggleView = (view) => {
    setViewMode(view);
    setSearchParams({ view });
  };

  // Función para obtener color del progreso
  const getProgressColor = (progress) => {
    if (progress >= 80) return '#22C55E'; // Verde
    if (progress >= 50) return '#3B82F6'; // Azul
    if (progress >= 25) return '#F97316'; // Naranja
    return '#EF4444'; // Rojo
  };

  return (
    <>
      <Navbar />
      
      <div className="dashboard-wrapper">
        {/* FONDO ULTRA LIGERO (2 ORBES AZULES) */}
        <div className="orb orb-blue"></div>
        <div className="orb orb-cyan"></div>
        <div className="bg-gradient"></div>

        <div className="dashboard-content">
          {/* HEADER */}
          <div className="dashboard-header">
            <h1 className="dashboard-title">
              Mis Proyectos <span className="project-count">({filteredProjects.length})</span>
            </h1>

            {/* dashboard-actions con position: relative para anclar la burbuja */}
            <div className="dashboard-actions">
              {/* BÚSQUEDA EN TIEMPO REAL */}
              <div className="search-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar por nombre, cliente, estado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => toggleView('grid')}
                >
                  <List size={14} />
                  <span>Lista</span>
                </button>
                <button
                  className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                  onClick={() => toggleView('kanban')}
                >
                  <LayoutGrid size={14} />
                  <span>Kanban</span>
                </button>
              </div>

              <button className="stats-btn" onClick={toggleStats}>
                <BarChart3 size={16} />
                <span>Métricas</span>
              </button>
            </div>
          </div>

          {/* CONTENIDO */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Cargando...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={40} />
              <p>Sin proyectos</p>
              <span>{searchTerm ? 'No se encontraron proyectos con ese filtro' : 'Crea tu primer proyecto'}</span>
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="kanban-wrapper">
              <KanbanBoard 
                projects={filteredProjects} 
                onProjectClick={handleProjectClick}
                onProjectUpdate={refreshProjects}
              />
            </div>
          ) : (
            <div className="projects-scroll-container">
              <div className="projects-grid">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="project-card"
                    onClick={() => handleProjectClick(project)}
                  >
                    <div className="project-icon">
                      <FolderOpen size={22} />
                    </div>
                    <div className="project-info">
                      <div className="project-name">{project.name}</div>
                      <div className="project-meta">
                        <span className="project-client">
                          {project.client_name || 'Sin cliente'}
                        </span>
                        <span className="project-bullet">•</span>
                        <span className="project-budget">
                          ${project.budget?.toLocaleString('es-MX')}
                        </span>
                      </div>
                      <div className={`status-badge ${project.status || 'pending'}`}>
                        {project.status === 'in_progress' ? 'En progreso' : 
                         project.status === 'completed' ? 'Completado' : 
                         'Pendiente'}
                      </div>
                      
                      {/* BARRA DE PROGRESO NUEVA */}
                      <div className="project-progress-container">
                        <div className="project-progress-header">
                          <span className="project-progress-label">Progreso</span>
                          <span className="project-progress-value">{project.progress || 0}%</span>
                        </div>
                        <div className="project-progress-track">
                          <div 
                            className="project-progress-fill"
                            style={{ 
                              width: `${project.progress || 0}%`,
                              backgroundColor: getProgressColor(project.progress || 0)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="project-arrow" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DE ESTADÍSTICAS (BURBUJA FLOTANTE ANCLADA AL BOTÓN) */}
      {showStats && (
        <div className="stats-panel-left">
          <div className="stats-header">
            <span className="stats-title">
              <BarChart3 size={16} /> Métricas
            </span>
            <button className="stats-close" onClick={toggleStats}>
              <X size={16} />
            </button>
          </div>
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total</span>
              <FolderOpen size={16} className="stat-icon" />
            </div>
            <div className="stat-box">
              <span className="stat-number">{stats.inProgress}</span>
              <span className="stat-label">En progreso</span>
              <Clock size={16} className="stat-icon" />
            </div>
            <div className="stat-box">
              <span className="stat-number">{stats.completed}</span>
              <span className="stat-label">Completados</span>
              <CheckCircle2 size={16} className="stat-icon" />
            </div>
            <div className="stat-box">
              <span className="stat-number">${stats.totalBudget.toLocaleString('es-MX')}</span>
              <span className="stat-label">Presupuesto</span>
              <Wallet size={16} className="stat-icon" />
            </div>
          </div>
          <div className="stats-footer">
            <TrendingUp size={14} />
            <span>Datos actualizados en tiempo real</span>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {showEditModal && editingProject && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Proyecto</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    rows="3"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Presupuesto (MXN)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      {showDeleteModal && projectToDelete && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-delete" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDeleteModal}>
              <X size={18} />
            </button>
            <div className="delete-icon">
              <AlertTriangle size={32} />
            </div>
            <h2>¿Eliminar proyecto?</h2>
            <p>
              Eliminarás <strong>"{projectToDelete.name}"</strong>
              <br />
              <span className="warning">
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Esta acción no se puede deshacer
              </span>
            </p>
            <div className="delete-actions">
              <button className="btn-cancel" onClick={closeDeleteModal} disabled={deleting}>
                Cancelar
              </button>
              <button className="btn-delete" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}