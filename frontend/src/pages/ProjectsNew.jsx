import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import './ProjectsNew.css';

export default function ProjectsNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    client_id: '',
  });

  useEffect(() => {
    fetchClients();
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

    const projectData = {
      name: formData.name.trim(),
      description: formData.description?.trim() || "",
      budget: Number(formData.budget),
      client_id: Number(formData.client_id),
      start_date: null,
      end_date: null
    };

    try {
      await api.post('/projects/', projectData);
      alert('✅ Proyecto creado exitosamente');
      navigate('/dashboard');
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

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
                    ⚠️ No hay clientes. Crea uno primero.
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
    </>
  );
}