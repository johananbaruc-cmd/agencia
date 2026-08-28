import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { CheckCircle, X } from 'lucide-react';
import './ProjectsNew.css';

export default function ProjectsNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    client_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchClients();
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      start_date: today
    }));
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name.trim()) {
      setError('El nombre del proyecto es requerido');
      setLoading(false);
      return;
    }

    if (!formData.client_id) {
      setError('Debes seleccionar un cliente');
      setLoading(false);
      return;
    }

    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      setError('El presupuesto debe ser mayor a 0');
      setLoading(false);
      return;
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        setError('La fecha de fin no puede ser anterior a la fecha de inicio');
        setLoading(false);
        return;
      }
    }

    const projectData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || "",
      budget: Number(formData.budget),
      client_id: Number(formData.client_id),
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
    };

    try {
      const response = await api.post('/projects/', projectData);
      setCreatedProject(response.data);
      setShowSuccessModal(true);
      setLoading(false);
    } catch (error) {
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map(d => `${d.loc?.join('.')}: ${d.msg}`).join('\n'));
        } else {
          setError(detail);
        }
      } else {
        setError('Error al crear proyecto');
      }
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate('/dashboard');
  };

  const handleViewProject = () => {
    setShowSuccessModal(false);
    navigate(`/projects/${createdProject.id}`);
  };

  return (
    <>
      <Navbar />
      
      {/* ===== FONDO ULTRA LIGERO (ORBES AZULES) ===== */}
      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

      <div className="projects-new-container">
        <div className="form-card">

          {/* HEADER */}
          <div className="form-header">
            <h1>Crear Nuevo Proyecto</h1>
            <p>Completa los datos para iniciar un nuevo proyecto</p>
          </div>

          {/* BODY */}
          <div className="form-body">

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* NOMBRE */}
              <div className="form-group">
                <label className="form-label">
                  Nombre del proyecto <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Rediseño Web"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              {/* CLIENTE */}
              <div className="form-group">
                <label className="form-label">
                  Cliente <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.client_id}
                  onChange={(e) =>
                    setFormData({ ...formData, client_id: e.target.value })
                  }
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.company ? `- ${client.company}` : ''}
                    </option>
                  ))}
                </select>

                {clients.length === 0 && (
                  <div className="warning-message">
                    No hay clientes. Crea uno primero.
                  </div>
                )}
              </div>

              {/* PRESUPUESTO */}
              <div className="form-group">
                <label className="form-label">
                  Presupuesto (MXN) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-input"
                  placeholder="0"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                />
              </div>

              {/* FECHAS */}
              <div className="form-row">
                <div className="form-group form-group-half">
                  <label className="form-label">
                    Fecha de inicio <span className="readonly-badge">Bloqueado</span>
                  </label>
                  <input
                    type="date"
                    className="form-input form-input-readonly"
                    value={formData.start_date}
                    readOnly
                    disabled
                  />
                  <small className="helper-text">
                    Se establece automáticamente al crear
                  </small>
                </div>

                <div className="form-group form-group-half">
                  <label className="form-label">
                    Fecha de fin <span className="optional-badge">Opcional</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.end_date}
                    min={formData.start_date || undefined}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                  <small className="helper-text">
                    {formData.start_date && !formData.end_date && 
                      'Deja vacío si no tienes fecha definida'
                    }
                    {formData.start_date && formData.end_date && 
                      `${Math.ceil((new Date(formData.end_date) - new Date(formData.start_date)) / (1000 * 60 * 60 * 24))} días de duración`
                    }
                  </small>
                </div>
              </div>

              {/* DESCRIPCIÓN */}
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  rows={4}
                  className="form-textarea"
                  placeholder="Describe el proyecto..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {/* BOTONES */}
              <div className="form-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading && <span className="loading-spinner-small"></span>}
                  {loading ? 'Creando...' : 'Crear Proyecto'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL DE ÉXITO */}
      {/* ========================================== */}
      {showSuccessModal && createdProject && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            
            {/* Icono de éxito */}
            <div className="modal-icon">
              <svg className="success-icon" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" className="success-circle" />
                <path d="M30 50 L45 65 L75 35" className="success-check" />
              </svg>
            </div>

            {/* Título */}
            <h2 className="modal-title">Proyecto Creado</h2>
            
            {/* Subtítulo */}
            <p className="modal-subtitle">
              El proyecto ha sido creado exitosamente
            </p>

            {/* Detalles del proyecto */}
            <div className="modal-details">
              <div className="detail-item">
                <span className="detail-label">Nombre</span>
                <span className="detail-value">{createdProject.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Presupuesto</span>
                <span className="detail-value">${createdProject.budget.toLocaleString()} MXN</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Estado</span>
                <span className="detail-value status-badge-modal">{createdProject.status || 'Pendiente'}</span>
              </div>
              {createdProject.end_date && (
                <div className="detail-item">
                  <span className="detail-label">Fecha fin</span>
                  <span className="detail-value">
                    {new Date(createdProject.end_date).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="modal-actions">
              <button 
                className="modal-btn-primary"
                onClick={handleViewProject}
              >
                Ver Proyecto
              </button>
              <button 
                className="modal-btn-secondary"
                onClick={handleCloseModal}
              >
                Ir al Dashboard
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}