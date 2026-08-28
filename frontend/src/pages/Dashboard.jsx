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
  BarChart3
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
              Mis Proyectos <span className="project-count">({projects.length})</span>
            </h1>

            <div className="dashboard-actions">
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
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={40} />
              <p>Sin proyectos</p>
              <span>Crea tu primer proyecto</span>
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="kanban-wrapper">
              <KanbanBoard 
                projects={projects} 
                onProjectClick={handleProjectClick}
                onProjectUpdate={refreshProjects}
              />
            </div>
          ) : (
            <div className="projects-scroll-container">
              <div className="projects-grid">
                {projects.map((project) => (
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
                    </div>
                    <ChevronRight size={18} className="project-arrow" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PANEL DE ESTADÍSTICAS */}
      {showStats && (
        <div className="stats-panel">
          <div className="stats-header">
            <span className="stats-title">📊 Métricas</span>
            <button className="stats-close" onClick={toggleStats}>
              <X size={16} />
            </button>
          </div>
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{stats.inProgress}</span>
              <span className="stat-label">En progreso</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{stats.completed}</span>
              <span className="stat-label">Completados</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">${stats.totalBudget.toLocaleString('es-MX')}</span>
              <span className="stat-label">Presupuesto</span>
            </div>
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
              <span className="warning">⚠️ Esta acción no se puede deshacer</span>
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