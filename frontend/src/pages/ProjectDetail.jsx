import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
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
  Clock,
  CheckCircle
} from 'lucide-react';
import './ProjectDetail.css';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    status: '',
    progress: 0
  });

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
        status: response.data.status,
        progress: response.data.progress || 0
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar el proyecto');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/projects/${id}`, {
        name: formData.name,
        description: formData.description,
        budget: parseFloat(formData.budget),
        status: formData.status,
        progress: parseInt(formData.progress)
      });
      alert('✅ Proyecto actualizado');
      setIsEditing(false);
      fetchProject();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error al actualizar');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
      try {
        await api.delete(`/projects/${id}`);
        alert('✅ Proyecto eliminado');
        navigate('/dashboard');
      } catch (error) {
        alert(error.response?.data?.detail || 'Error al eliminar');
      }
    }
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

  if (loading) {
    return (
      <>
        <Navbar />
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
      <div className="detail-container">
        <div className="detail-content">
          {/* Botón volver */}
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
            Volver al Dashboard
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
              
              <div className="detail-actions">
                {isEditing ? (
                  <>
                    <button className="save-btn" onClick={handleUpdate}>
                      <Save size={16} />
                      Guardar
                    </button>
                    <button className="cancel-btn" onClick={() => setIsEditing(false)}>
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
                    <button className="delete-btn" onClick={handleDelete}>
                      <Trash2 size={16} />
                      Eliminar
                    </button>
                  </>
                )}
              </div>
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
                <Clock size={18} />
                <div>
                  <label>Progreso</label>
                  {isEditing ? (
                    <div className="progress-edit">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.progress}
                        onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                      />
                      <span>{formData.progress}%</span>
                    </div>
                  ) : (
                    <>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="progress-text">{project.progress}%</span>
                    </>
                  )}
                </div>
              </div>

              <div className="info-card">
                <FileText size={18} />
                <div>
                  <label>Estado</label>
                  {isEditing ? (
                    <select
                      className="edit-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="completed">Completado</option>
                      <option value="paused">Pausado</option>
                    </select>
                  ) : (
                    <span>{getStatusText(project.status)}</span>
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
    </>
  );
}
