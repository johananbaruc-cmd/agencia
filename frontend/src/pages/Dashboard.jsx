import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import KanbanBoard from '../components/KanbanBoard';
import { FolderOpen, Clock, CheckCircle, DollarSign, LayoutGrid, List, X, AlertTriangle, Eye } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  
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

  // ✅ Al hacer clic en un proyecto, navega a ProjectDetail
  const handleProjectClick = (project) => {
    navigate(`/projects/${project.id}`);
  };

  // ✅ Funciones para editar desde el dashboard (se mantienen)
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

  // ✅ Funciones para eliminar desde el dashboard
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
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-title">
              <h1>Dashboard</h1>
              <p>Bienvenido, {user?.name}</p>
            </div>
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => toggleView('grid')}
              >
                <List size={16} />
                Lista
              </button>
              <button
                className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                onClick={() => toggleView('kanban')}
              >
                <LayoutGrid size={16} />
                Kanban
              </button>
            </div>
          </div>
        </div>

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
              <p className="empty-title">No hay proyectos</p>
              <p className="empty-subtitle">Crea tu primer proyecto</p>
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanBoard 
              projects={projects} 
              onProjectClick={handleProjectClick}
              onProjectUpdate={refreshProjects}
            />
          ) : (
            <div className="projects-list">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="project-list-item"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="project-name">{project.name}</div>
                  <div className="project-meta">
                    Cliente: {project.client_name || 'Sin cliente'} • 
                    ${project.budget?.toLocaleString('es-MX')} 
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ✅ Modal de Edición */}
      {showEditModal && editingProject && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Proyecto</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="modal-form-group">
                  <label className="modal-form-label">Nombre del proyecto</label>
                  <input
                    type="text"
                    required
                    className="modal-form-input"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                <div className="modal-form-group">
                  <label className="modal-form-label">Descripción</label>
                  <textarea
                    className="modal-form-input"
                    rows="3"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  />
                </div>

                <div className="modal-form-group">
                  <label className="modal-form-label">Presupuesto (MXN)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    className="modal-form-input"
                    value={editFormData.budget}
                    onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-modal-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Modal de confirmación de eliminación */}
      {showDeleteModal && projectToDelete && (
        <div className="modal-eliminar-overlay" onClick={closeDeleteModal}>
          <div className="modal-eliminar-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-eliminar-close" onClick={closeDeleteModal}>
              <X size={20} />
            </button>
            
            <div className="modal-eliminar-icon">
              <AlertTriangle size={48} />
            </div>
            
            <h2>¿Eliminar proyecto?</h2>
            
            <p className="modal-eliminar-mensaje">
              Estás a punto de eliminar el proyecto <strong>"{projectToDelete.name}"</strong>.
              <span className="texto-advertencia"> ⚠️ Esta acción eliminará todas las tareas y evidencias asociadas a este proyecto.</span>
              <br />
              <span className="texto-importante">Esta acción no se puede deshacer.</span>
            </p>
            
            <div className="modal-eliminar-actions">
              <button 
                onClick={closeDeleteModal}
                className="btn-eliminar-cancelar"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="btn-eliminar-confirmar"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="spinner-small"></span>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    Sí, eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}