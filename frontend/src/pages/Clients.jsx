import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Users, Mail, UserPlus, Trash2, X, Edit, Building2, Phone, Search } from 'lucide-react';
import './Clients.css';

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    rfc: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirmClosing, setIsConfirmClosing] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  // Filtrar clientes en tiempo real
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase().trim();
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        (client.company && client.company.toLowerCase().includes(term)) ||
        (client.phone && client.phone.includes(term))
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  useEffect(() => {
    document.body.style.overflow = (showModal || showConfirmModal) ? 'hidden' : 'hidden'; // Siempre oculto, scroll interno
  }, [showModal, showConfirmModal]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      setClients(response.data);
      setFilteredClients(response.data);
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
    setIsClosing(false);
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
    setIsClosing(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setEditingClient(null);
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
        setMessage({ text: `Cliente actualizado`, type: 'success' });
      } else {
        await api.post('/clients/', formData);
        setMessage({ text: `Cliente creado`, type: 'success' });
      }

      setFormData({ name: '', email: '', phone: '', company: '', rfc: '' });
      handleCloseModal();
      fetchClients();

    } catch (error) {
      setMessage({
        text: error.response?.data?.detail || 'Error',
        type: 'error'
      });
    }
  };

  const handleDeleteClick = (id, name) => {
    setClientToDelete({ id, name });
    setIsConfirmClosing(false);
    setShowConfirmModal(true);
  };

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
      handleCloseConfirmModal();
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmClosing(true);
    setTimeout(() => {
      setShowConfirmModal(false);
      setIsConfirmClosing(false);
      setClientToDelete(null);
    }, 300);
  };

  const getPastelColor = (name) => {
    const pastelColors = [
      '#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#f59e0b',
      '#a78bfa', '#f87171', '#22d3ee', '#f0abfc', '#86efac'
    ];
    const index = name.length % pastelColors.length;
    return pastelColors[index];
  };

  return (
    <>
      <Navbar />
      
      {/* ===== FONDO ULTRA LIGERO (ORBES AZULES) ===== */}
      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

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

        {/* BUSCADOR */}
        <div className="search-container">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre, email, empresa o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="search-clear"
                onClick={() => setSearchTerm('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <span className="search-count">
            {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'}
          </span>
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
              <p>Cargando clientes...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? (
                <>
                  <Search size={40} />
                  <p>No hay resultados para "{searchTerm}"</p>
                  <span>Intenta con otro término de búsqueda</span>
                </>
              ) : (
                <>
                  <Users size={40} />
                  <p>No hay clientes</p>
                  <span>Registra tu primer cliente</span>
                </>
              )}
            </div>
          ) : (
            <div className="clients-grid">
              {filteredClients.map((client) => {
                const borderColor = getPastelColor(client.name);
                return (
                  <div key={client.id} className="client-card" style={{ borderColor: borderColor }}>

                    <div className="client-card-header">
                      <div className="client-avatar" style={{ background: borderColor }}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="client-info">
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
                        {client.phone ? (
                          <>
                            <Phone size={12} />
                            {client.phone}
                          </>
                        ) : (
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
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className={`modal-overlay ${isClosing ? 'closing' : ''}`}>
          <div className={`modal-container ${isClosing ? 'closing' : ''}`}>
            
            <div className="modal-header">
              <h2>{editingClient ? 'Editar Cliente' : 'Registrar Cliente'}</h2>
              <button onClick={handleCloseModal} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">

                <div className="form-group-modal">
                  <label className="form-label-modal">Nombre completo</label>
                  <input
                    type="text"
                    required
                    className="modal-form-input"
                    placeholder="Ej: Juan Pérez"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group-modal">
                  <label className="form-label-modal">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    className="modal-form-input"
                    placeholder="cliente@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-row-modal">
                  <div className="form-group-modal form-half">
                    <label className="form-label-modal">Empresa</label>
                    <input
                      type="text"
                      className="modal-form-input"
                      placeholder="Empresa"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    />
                  </div>
                  <div className="form-group-modal form-half">
                    <label className="form-label-modal">Teléfono</label>
                    <input
                      type="text"
                      className="modal-form-input"
                      placeholder="55 1234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group-modal">
                  <label className="form-label-modal">RFC</label>
                  <input
                    type="text"
                    className="modal-form-input"
                    placeholder="XAXX010101000"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={handleCloseModal} className="btn-modal-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-primary">
                  {editingClient ? 'Actualizar' : 'Guardar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && (
        <div className={`confirm-overlay ${isConfirmClosing ? 'closing' : ''}`}>
          <div className={`confirm-modal ${isConfirmClosing ? 'closing' : ''}`}>
            
            <div className="confirm-icon">
              <Trash2 size={40} />
            </div>
            
            <h3>¿Eliminar cliente?</h3>
            <p>
              ¿Estás seguro de que deseas eliminar a <strong>{clientToDelete?.name}</strong>?
            </p>
            <p className="confirm-warning">
              Esta acción no se puede deshacer
            </p>
            
            <div className="confirm-buttons">
              <button className="confirm-btn-cancel" onClick={handleCloseConfirmModal}>
                Cancelar
              </button>
              <button className="confirm-btn-delete" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}