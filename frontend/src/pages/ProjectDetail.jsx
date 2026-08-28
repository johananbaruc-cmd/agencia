import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
// ELIMINADO: import FondoMarmol from '../components/FondoMarmol';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Calendar,
  DollarSign,
  User,
  FileText,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import './ProjectDetail.css';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    end_date: '',
  });

  const fromReports = location.state?.from === 'reports';

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
      setFormData({
        name: response.data.name,
        description: response.data.description || '',
        budget: response.data.budget,
        end_date: response.data.end_date ? new Date(response.data.end_date).toISOString().split('T')[0] : '',
      });
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Error al cargar el proyecto');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        budget: parseFloat(formData.budget),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      };
      
      await api.patch(`/projects/${id}`, updateData);
      showNotification('success', 'Proyecto actualizado correctamente');
      setIsEditing(false);
      fetchProject();
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', error.response?.data?.detail || 'Error al actualizar');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${id}`);
      showNotification('success', 'Proyecto eliminado correctamente');
      setTimeout(() => {
        goBack();
      }, 500);
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', error.response?.data?.detail || 'Error al eliminar');
      setDeleting(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completado',
      paused: 'Pausado'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      pending: 'status-pending',
      in_progress: 'status-progress',
      completed: 'status-completed',
      paused: 'status-paused'
    };
    return classMap[status] || 'status-pending';
  };

  const goBack = () => {
    if (fromReports) {
      navigate('/reportes/gestion');
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="orb orb-blue"></div>
        <div className="orb orb-cyan"></div>
        <div className="bg-gradient"></div>
        <div className="detail-loading">
          <div className="loading-spinner"></div>
          <p>Cargando proyecto...</p>
        </div>
      </>
    );
  }

  if (!project) return null;

  return (
    <>
      <Navbar />
      
      {/* ===== FONDO ULTRA LIGERO (ORBES AZULES) ===== */}
      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

      {/* ===== CONTENIDO PRINCIPAL (FLUYE ENCIMA) ===== */}
      <div className="detail-container">
        <div className="detail-content">
          {/* Botón volver */}
          <button className="back-btn" onClick={goBack}>
            <ArrowLeft size={18} />
            {fromReports ? 'Volver a Gestión de Reportes' : 'Volver atrás'}
          </button>

          {/* Tarjeta principal */}
          <div className="detail-card">
            {/* Header con título y botones */}
            <div className="detail-header">
              {isEditing ? (
                <input
                  type="text"
                  className="edit-title-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              ) : (
                <h1>{project.name}</h1>
              )}
              
              {!fromReports && (
                <div className="detail-actions">
                  {isEditing ? (
                    <>
                      <button className="save-btn" onClick={handleUpdate}>
                        <Save size={16} />
                        Guardar
                      </button>
                      <button className="cancel-btn" onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: project.name,
                          description: project.description || '',
                          budget: project.budget,
                          end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
                        });
                      }}>
                        <X size={16} />
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="edit-btn" onClick={() => setIsEditing(true)}>
                        <Edit size={16} />
                        Editar
                      </button>
                      <button className="delete-btn" onClick={() => setShowDeleteModal(true)}>
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Badge de estado */}
            <div className={`status-badge ${getStatusClass(project.status)}`}>
              {getStatusText(project.status)}
            </div>

            {/* Grid de información */}
            <div className="info-grid">
              <div className="info-card">
                <DollarSign size={18} />
                <div>
                  <label>Presupuesto</label>
                  {isEditing ? (
                    <input
                      type="number"
                      className="edit-input"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                  ) : (
                    <span>${project.budget?.toLocaleString('es-MX')} MXN</span>
                  )}
                </div>
              </div>

              <div className="info-card">
                <User size={18} />
                <div>
                  <label>Cliente</label>
                  <span>{project.client_name || 'Cliente ID: ' + project.client_id}</span>
                </div>
              </div>

              <div className="info-card">
                <Calendar size={18} />
                <div>
                  <label>Fecha creación</label>
                  <span>{new Date(project.created_at).toLocaleDateString('es-MX')}</span>
                </div>
              </div>

              <div className="info-card">
                <FileText size={18} />
                <div>
                  <label>Estado</label>
                  <span>{getStatusText(project.status)}</span>
                </div>
              </div>
            </div>

            {/* Fecha de fin */}
            <div className="dates-section">
              <h3>Fecha de entrega</h3>
              <div className="date-card date-editable">
                <div className="date-icon">
                  <Calendar size={18} />
                </div>
                <div className="date-info">
                  <label>Fecha de fin</label>
                  {isEditing ? (
                    <>
                      <input
                        type="date"
                        className="edit-date-input"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                      <small className="date-helper">
                        {formData.end_date ? 
                          `Fecha seleccionada: ${new Date(formData.end_date).toLocaleDateString('es-MX')}` :
                          'Deja vacío si no hay fecha definida'
                        }
                      </small>
                    </>
                  ) : (
                    <>
                      <span className="date-value">
                        {project.end_date ? 
                          new Date(project.end_date).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : 
                          'No definida'
                        }
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="description-section">
              <h3>Descripción del proyecto</h3>
              {isEditing ? (
                <textarea
                  className="edit-textarea"
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el proyecto..."
                />
              ) : (
                <p>{project.description || 'Sin descripción'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notificación Toast */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          <div className="toast-content">
            {notification.type === 'success' && <CheckCircle size={20} />}
            {notification.type === 'error' && <AlertTriangle size={20} />}
            <span>{notification.message}</span>
          </div>
          <button className="toast-close" onClick={() => setNotification(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && !fromReports && (
        <div className="modal-eliminar-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-eliminar-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-eliminar-close" onClick={() => setShowDeleteModal(false)}>
              <X size={20} />
            </button>
            
            <div className="modal-eliminar-icon">
              <AlertTriangle size={48} />
            </div>
            
            <h2>¿Eliminar proyecto?</h2>
            
            <p className="modal-eliminar-mensaje">
              Estás a punto de eliminar el proyecto <strong>"{project.name}"</strong>.
              <span className="texto-advertencia"> Esta acción eliminará todas las tareas y evidencias asociadas.</span>
              <br />
              <span className="texto-importante">Esta acción no se puede deshacer.</span>
            </p>
            
            <div className="modal-eliminar-info">
              <div className="modal-eliminar-info-item">
                <span className="modal-eliminar-info-label">Estado</span>
                <span className="modal-eliminar-info-value">{getStatusText(project.status)}</span>
              </div>
              <div className="modal-eliminar-info-item">
                <span className="modal-eliminar-info-label">Presupuesto</span>
                <span className="modal-eliminar-info-value">${project.budget?.toLocaleString('es-MX')} MXN</span>
              </div>
              <div className="modal-eliminar-info-item">
                <span className="modal-eliminar-info-label">Cliente</span>
                <span className="modal-eliminar-info-value">{project.client_name || 'Sin cliente'}</span>
              </div>
            </div>
            
            <div className="modal-eliminar-actions">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="btn-eliminar-cancelar"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
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
                    <Trash2 size={16} />
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