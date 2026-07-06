import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Users, Mail, UserPlus, Trash2, Briefcase, X, Edit, Building2, Phone } from 'lucide-react';
import './Clients.css';

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    rfc: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  // Modal de confirmación personalizado para eliminar
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  // Bloquear scroll cuando modal está abierto
  useEffect(() => {
    document.body.style.overflow = showConfirmModal ? 'hidden' : 'auto';
  }, [showConfirmModal]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      setClients(response.data);
    } catch (error) {
      console.error(error);
      setMessage({ text: 'Error al cargar clientes', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '', phone: '', company: '', rfc: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      rfc: client.rfc || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
        setMessage({ text: `Cliente actualizado`, type: 'success' });
        setShowModal(false);
      } else {
        await api.post('/clients/', formData);
        setMessage({ text: `Cliente creado`, type: 'success' });
        setShowModal(false);
      }

      setFormData({ name: '', email: '', phone: '', company: '', rfc: '' });
      fetchClients();

    } catch (error) {
      setMessage({
        text: error.response?.data?.detail || 'Error',
        type: 'error'
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  // Abre el modal de confirmación para eliminar
  const handleDeleteClick = (id, name) => {
    setClientToDelete({ id, name });
    setShowConfirmModal(true);
  };

  // Elimina después de confirmar
  const confirmDelete = async () => {
    if (!clientToDelete) return;
    
    try {
      await api.delete(`/clients/${clientToDelete.id}`);
      setMessage({ text: `Cliente ${clientToDelete.name} eliminado`, type: 'success' });
      fetchClients();
    } catch (error) {
      const errorDetail = error.response?.data?.detail;
      
      if (errorDetail && errorDetail.includes("proyecto(s) asociado(s)")) {
        setMessage({ text: errorDetail, type: 'error' });
      } else {
        setMessage({ text: errorDetail || 'Error al eliminar', type: 'error' });
      }
    } finally {
      setShowConfirmModal(false);
      setClientToDelete(null);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  return (
    <>
      <Navbar />

      <div className="clients-container">

        {/* HEADER */}
        <div className="clients-header">
          <div className="clients-header-content">
            <div>
              <h1>Clientes</h1>
              <p>Gestiona tus clientes y empresas</p>
            </div>

            <button onClick={handleOpenCreateModal} className="btn-new-client">
              <UserPlus size={16} />
              Registrar
            </button>
          </div>
        </div>

        {/* MENSAJE */}
        {message.text && (
          <div className={`message-floating ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* MAIN */}
        <main className="clients-main">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="empty-state">
              <Users size={40} />
              <p>No hay clientes</p>
            </div>
          ) : (
            <div className="clients-grid">
              {clients.map((client) => (
                <div key={client.id} className="client-card">

                  <div className="client-card-header">
                    <div className="client-avatar">
                      {client.name.charAt(0)}
                    </div>

                    <div>
                      <div className="client-name">{client.name}</div>
                      <div className="client-email">
                        <Mail size={12} />
                        {client.email}
                      </div>
                    </div>

                    <div className="client-actions">
                      <button className="edit-btn" onClick={() => handleOpenEditModal(client)}>
                        <Edit size={14} />
                      </button>
                      <button className="delete-btn" onClick={() => handleDeleteClick(client.id, client.name)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="client-card-footer">
                    <div className="client-badge">
                      <Building2 size={12} />
                      {client.company || 'Sin empresa'}
                    </div>

                    <div className="client-status">
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {client.phone}
                        </span>
                      )}
                      {!client.phone && (
                        <span className="text-gray-500">Sin teléfono</span>
                      )}
                    </div>
                  </div>

                  {client.rfc && (
                    <div className="client-rfc-wrapper">
                      <span className="client-rfc">RFC: {client.rfc}</span>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">

            <div className="modal-header">
              <h2>{editingClient ? 'Editar' : 'Registrar'}</h2>
              <button onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                <input
                  type="text"
                  required
                  className="modal-form-input"
                  placeholder="Nombre *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />

                <input
                  type="email"
                  required
                  className="modal-form-input"
                  placeholder="Correo *"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />

                <input
                  type="text"
                  className="modal-form-input"
                  placeholder="Empresa"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />

                <input
                  type="text"
                  className="modal-form-input"
                  placeholder="Teléfono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />

                <input
                  type="text"
                  className="modal-form-input"
                  placeholder="RFC"
                  value={formData.rfc}
                  onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                />

              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-modal-primary">
                  Guardar
                </button>
                <button type="button" onClick={handleCloseModal} className="btn-modal-secondary">
                  Cancelar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      {showConfirmModal && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>Confirmar eliminación</h3>
            <p>¿Estás seguro de que deseas eliminar a <strong>{clientToDelete?.name}</strong>?</p>
            <div className="confirm-buttons">
              <button className="confirm-btn-delete" onClick={confirmDelete}>
                Eliminar
              </button>
              <button className="confirm-btn-cancel" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}