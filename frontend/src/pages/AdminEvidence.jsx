import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { STATIC_URL } from '../services/api'; // ✅ STATIC_URL viene de api.js
import Navbar from '../components/Navbar';
import { 
  FolderOpen, FileImage, Users, Eye, ExternalLink, 
  Download, X, AlertTriangle, File, Image, Video, FileText, 
  Search, CheckCircle, XCircle, Clock, MessageSquare, Send, Calendar, Edit
} from 'lucide-react';
import './AdminEvidence.css';

export default function AdminEvidence() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [filteredEvidence, setFilteredEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [evidenceToReject, setEvidenceToReject] = useState(null);
  const [rejectDeliveryDate, setRejectDeliveryDate] = useState('');

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [evidenceToApprove, setEvidenceToApprove] = useState(null);

  const [showEditDateModal, setShowEditDateModal] = useState(false);
  const [evidenceToEditDate, setEvidenceToEditDate] = useState(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');

  // ✅ Usar STATIC_URL de api.js (SIN /api/v1)
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    let cleanUrl = url;
    if (cleanUrl.includes('/api/v1')) {
      cleanUrl = cleanUrl.replace('/api/v1', '');
    }
    if (!cleanUrl.startsWith('/')) {
      cleanUrl = '/' + cleanUrl;
    }
    return `${STATIC_URL}${cleanUrl}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/');
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProject(response.data[0]);
        await fetchEvidence(response.data[0].id);
        await fetchMembers(response.data[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidence = async (projectId) => {
    setLoadingEvidence(true);
    try {
      const response = await api.get(`/tasks/projects/${projectId}/tasks`);
      const tasks = response.data;
      
      let allEvidence = [];
      for (const task of tasks) {
        try {
          const evidenceResponse = await api.get(`/tasks/${task.id}/evidence`);
          const evidenceWithTask = evidenceResponse.data.map(ev => ({
            ...ev,
            task_title: task.title,
            task_id: task.id,
            project_name: selectedProject?.name,
            status: ev.status || 'pending',
            delivery_date: ev.delivery_date || ev.created_at
          }));
          allEvidence = [...allEvidence, ...evidenceWithTask];
        } catch (error) {
          console.error(`Error cargando evidencia de tarea ${task.id}:`, error);
        }
      }
      
      setEvidence(allEvidence);
      applyFilters(allEvidence, searchTerm, filterType, 'pending');
    } catch (error) {
      console.error('Error cargando evidencia:', error);
      setMessage({ text: 'Error al cargar evidencia', type: 'error' });
    } finally {
      setLoadingEvidence(false);
    }
  };

  const fetchMembers = async (projectId) => {
    try {
      const response = await api.get(`/projects/${projectId}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error cargando miembros:', error);
    }
  };

  const handleProjectChange = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project);
    await fetchEvidence(projectId);
    await fetchMembers(projectId);
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('pending');
  };

  const applyFilters = (data, search, type, status) => {
    let filtered = data;
    
    if (type !== 'all') {
      filtered = filtered.filter(e => e.file_type === type);
    }
    
    if (status !== 'all') {
      filtered = filtered.filter(e => e.status === status);
    }
    
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(e => 
        e.file_name?.toLowerCase().includes(term) ||
        e.task_title?.toLowerCase().includes(term) ||
        e.uploaded_by_name?.toLowerCase().includes(term)
      );
    }
    
    setFilteredEvidence(filtered);
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(evidence, term, filterType, filterStatus);
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    applyFilters(evidence, searchTerm, type, filterStatus);
  };

  const handleStatusFilterChange = (status) => {
    setFilterStatus(status);
    applyFilters(evidence, searchTerm, filterType, status);
  };

  const openEvidenceDetail = (evidence) => {
    setSelectedEvidence(evidence);
    setShowEvidenceModal(true);
  };

  const openEditDateModal = (evidence) => {
    setEvidenceToEditDate(evidence);
    setNewDeliveryDate(formatDateForInput(evidence.delivery_date || evidence.created_at));
    setShowEditDateModal(true);
  };

  const confirmEditDate = async () => {
    if (!evidenceToEditDate) return;
    
    if (!newDeliveryDate) {
      setMessage({ text: '❌ Debes seleccionar una fecha', type: 'error' });
      return;
    }

    try {
      await api.put(`/tasks/evidence/${evidenceToEditDate.id}/delivery-date`, null, {
        params: { delivery_date: newDeliveryDate }
      });
      
      await fetchEvidence(selectedProject.id);
      
      setMessage({ text: '✅ Fecha de entrega actualizada', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: '❌ Error al actualizar fecha', type: 'error' });
    } finally {
      setShowEditDateModal(false);
      setEvidenceToEditDate(null);
      setNewDeliveryDate('');
    }
  };

  const handleApproveClick = (evidence) => {
    setEvidenceToApprove(evidence);
    setShowApproveConfirm(true);
  };

  const confirmApprove = async () => {
    if (!evidenceToApprove) return;
    
    try {
      await api.put(`/tasks/evidence/${evidenceToApprove.id}/approve`);
      
      const updatedEvidence = evidence.map(e => 
        e.id === evidenceToApprove.id 
          ? { ...e, status: 'approved', review_comment: null }
          : e
      );
      setEvidence(updatedEvidence);
      applyFilters(updatedEvidence, searchTerm, filterType, 'pending');
      
      setMessage({ text: '✅ Evidencia aprobada exitosamente', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: '❌ Error al aprobar evidencia', type: 'error' });
    } finally {
      setShowApproveConfirm(false);
      setEvidenceToApprove(null);
    }
  };

  const handleRejectClick = (evidence) => {
    setEvidenceToReject(evidence);
    setRejectReason('');
    setRejectDeliveryDate(formatDateForInput(evidence.delivery_date || evidence.created_at));
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!evidenceToReject) return;
    
    if (!rejectReason.trim()) {
      setMessage({ text: '❌ Debes indicar el motivo del rechazo', type: 'error' });
      return;
    }
    
    if (!rejectDeliveryDate) {
      setMessage({ text: '❌ Debes seleccionar una fecha de entrega', type: 'error' });
      return;
    }
    
    try {
      await api.put(`/tasks/evidence/${evidenceToReject.id}/reject?reason=${encodeURIComponent(rejectReason)}`);
      
      await api.put(`/tasks/evidence/${evidenceToReject.id}/delivery-date`, null, {
        params: { delivery_date: rejectDeliveryDate }
      });
      
      await fetchEvidence(selectedProject.id);
      
      setMessage({ text: '✅ Evidencia rechazada y fecha actualizada', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: '❌ Error al rechazar evidencia', type: 'error' });
    } finally {
      setShowRejectModal(false);
      setEvidenceToReject(null);
      setRejectReason('');
      setRejectDeliveryDate('');
    }
  };

  const getStatusInfo = (status) => {
    const map = {
      pending: { label: 'Pendiente', color: '#f59e0b', icon: <Clock size={14} /> },
      approved: { label: 'Aprobada', color: '#10b981', icon: <CheckCircle size={14} /> },
      rejected: { label: 'Rechazada', color: '#ef4444', icon: <XCircle size={14} /> }
    };
    return map[status] || map.pending;
  };

  const getFileTypeIcon = (fileType) => {
    const map = {
      image: <Image size={16} />,
      video: <Video size={16} />,
      document: <FileText size={16} />,
      audio: <FileText size={16} />
    };
    return map[fileType] || <File size={16} />;
  };

  const getFileTypeLabel = (fileType) => {
    const map = {
      image: 'Imagen',
      video: 'Video',
      document: 'Documento',
      audio: 'Audio'
    };
    return map[fileType] || 'Archivo';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <>
      <Navbar />
      <div className="admin-evidence-container">
        <div className="evidence-header">
          <div className="evidence-header-content">
            <div className="evidence-title">
              <h1>Gestión de Evidencias</h1>
              <p>Revisa y aprueba las evidencias pendientes</p>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`message-floating ${message.type}`}>
            {message.text}
          </div>
        )}

        <main className="evidence-main">
          {projects.length > 0 && (
            <div className="controls-bar">
              <div className="project-selector">
                <label>Proyecto:</label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => handleProjectChange(Number(e.target.value))}
                  className="project-select"
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filters">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="search-input"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="image">Imágenes</option>
                  <option value="video">Videos</option>
                  <option value="document">Documentos</option>
                  <option value="audio">Audios</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="filter-select"
                  style={{ 
                    borderColor: filterStatus === 'pending' ? '#f59e0b' : 
                                filterStatus === 'approved' ? '#10b981' : 
                                filterStatus === 'rejected' ? '#ef4444' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">⏳ Pendientes</option>
                  <option value="approved">✅ Aprobadas</option>
                  <option value="rejected">❌ Rechazadas</option>
                </select>

                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="btn-members"
                >
                  <Users size={16} />
                  {showMembers ? 'Ocultar Miembros' : 'Ver Miembros'}
                </button>
              </div>
            </div>
          )}

          {showMembers && (
            <div className="members-list">
              <h3>Miembros del proyecto</h3>
              <div className="members-grid">
                {members.map((member) => (
                  <div key={member.user_id || member.id} className="member-item">
                    <div className="member-avatar">
                      {((member.user_name || member.name)?.charAt(0) || 'U')}
                    </div>
                    <div className="member-info">
                      <span className="member-name">{member.user_name || member.name}</span>
                      <span className="member-email">{member.user_email || member.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !loadingEvidence && evidence.length > 0 && (
            <div className="evidence-counter">
              <span>Total: {evidence.length} evidencias</span>
              <span>Mostrando: {filteredEvidence.length}</span>
              <span>
                Pendientes: {evidence.filter(e => e.status === 'pending').length} | 
                Aprobadas: {evidence.filter(e => e.status === 'approved').length} | 
                Rechazadas: {evidence.filter(e => e.status === 'rejected').length}
              </span>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando proyectos...</p>
            </div>
          ) : loadingEvidence ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando evidencias pendientes...</p>
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="empty-state">
              <FileImage size={48} />
              <p className="empty-title">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'No se encontraron resultados'
                  : 'No hay evidencias pendientes por revisar'}
              </p>
              <p className="empty-subtitle">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Prueba con otros filtros'
                  : 'Todas las evidencias han sido revisadas'}
              </p>
            </div>
          ) : (
            <div className="evidence-grid">
              {filteredEvidence.map((item) => {
                const statusInfo = getStatusInfo(item.status);
                
                return (
                  <div key={item.id} className={`evidence-card ${item.status}`}>
                    <div className="evidence-card-header">
                      <div className="evidence-icon">
                        {getFileTypeIcon(item.file_type)}
                      </div>
                      <div className="evidence-info">
                        <div className="evidence-name">{item.file_name}</div>
                        <div className="evidence-meta">
                          <span>{getFileTypeLabel(item.file_type)}</span>
                          <span>•</span>
                          <span>{formatFileSize(item.file_size)}</span>
                        </div>
                      </div>
                      <div 
                        className="evidence-status-badge"
                        style={{ backgroundColor: statusInfo.color }}
                      >
                        {statusInfo.icon}
                        {statusInfo.label}
                      </div>
                    </div>

                    <div className="evidence-card-body">
                      <div className="evidence-task">
                        <span className="task-label">Tarea:</span>
                        <span className="task-name">{item.task_title || 'Sin tarea'}</span>
                      </div>
                      <div className="evidence-uploader">
                        <span>Subido por: {item.uploaded_by_name || 'Usuario'}</span>
                      </div>
                      {item.comment && (
                        <div className="evidence-comment">💬 {item.comment}</div>
                      )}
                      <div className="evidence-delivery-date">
                        <Calendar size={12} />
                        <span>Fecha de entrega: {formatDate(item.delivery_date || item.created_at)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDateModal(item);
                          }}
                          className="evidence-btn-edit-date"
                          title="Editar fecha de entrega"
                        >
                          <Edit size={12} />
                        </button>
                      </div>
                      {item.status === 'rejected' && item.review_comment && (
                        <div className="evidence-rejection">
                          <XCircle size={14} />
                          <span>Motivo: {item.review_comment}</span>
                        </div>
                      )}
                    </div>

                    <div className="evidence-card-footer">
                      <div className="evidence-date">
                        {new Date(item.created_at).toLocaleDateString('es-MX')}
                      </div>
                      <div className="evidence-actions">
                        <a
                          href={getFullUrl(item.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="evidence-btn-download"
                          title="Descargar"
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => openEvidenceDetail(item)}
                          className="evidence-btn-view"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveClick(item)}
                              className="evidence-btn-approve"
                              title="Aprobar"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleRejectClick(item)}
                              className="evidence-btn-reject"
                              title="Rechazar"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Todos los modales sin cambios */}
      {showEvidenceModal && selectedEvidence && (
        <div className="modal-overlay" onClick={() => setShowEvidenceModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Detalle de Evidencia</h2>
              <button className="modal-close" onClick={() => setShowEvidenceModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="evidence-detail">
                <div className="detail-row">
                  <span className="detail-label">Archivo:</span>
                  <span className="detail-value">{selectedEvidence.file_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tipo:</span>
                  <span className="detail-value">{getFileTypeLabel(selectedEvidence.file_type)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tamaño:</span>
                  <span className="detail-value">{formatFileSize(selectedEvidence.file_size)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Proyecto:</span>
                  <span className="detail-value">{selectedProject?.name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tarea:</span>
                  <span className="detail-value">{selectedEvidence.task_title || 'Sin tarea'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Subido por:</span>
                  <span className="detail-value">{selectedEvidence.uploaded_by_name || 'Usuario'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Fecha de entrega:</span>
                  <span className="detail-value">
                    {formatDate(selectedEvidence.delivery_date || selectedEvidence.created_at)}
                    <button
                      onClick={() => {
                        setShowEvidenceModal(false);
                        openEditDateModal(selectedEvidence);
                      }}
                      className="evidence-btn-edit-date-inline"
                      title="Editar fecha de entrega"
                    >
                      <Edit size={14} />
                    </button>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Estado:</span>
                  <span 
                    className="detail-status"
                    style={{ color: getStatusInfo(selectedEvidence.status).color }}
                  >
                    {getStatusInfo(selectedEvidence.status).icon}
                    {getStatusInfo(selectedEvidence.status).label}
                  </span>
                </div>
                {selectedEvidence.status === 'rejected' && selectedEvidence.review_comment && (
                  <div className="detail-row full">
                    <span className="detail-label">Motivo de rechazo:</span>
                    <span className="detail-value rejected">{selectedEvidence.review_comment}</span>
                  </div>
                )}
                <div className="detail-row full">
                  <a
                    href={getFullUrl(selectedEvidence.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-download"
                  >
                    <Download size={16} />
                    Abrir / Descargar
                  </a>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="btn-modal-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar fecha */}
      {showEditDateModal && evidenceToEditDate && (
        <div className="modal-overlay" onClick={() => setShowEditDateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Editar Fecha de Entrega</h2>
              <button className="modal-close" onClick={() => setShowEditDateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="edit-date-info">
                <p><strong>Archivo:</strong> {evidenceToEditDate.file_name}</p>
                <p><strong>Tarea:</strong> {evidenceToEditDate.task_title || 'Sin tarea'}</p>
                <p><strong>Fecha actual:</strong> {formatDate(evidenceToEditDate.delivery_date || evidenceToEditDate.created_at)}</p>
              </div>

              <div className="edit-date-form">
                <label className="edit-date-label">
                  Nueva fecha de entrega *
                </label>
                <input
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="edit-date-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowEditDateModal(false)}
                className="btn-modal-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={confirmEditDate}
                className="btn-modal-primary"
                disabled={!newDeliveryDate}
              >
                <Calendar size={16} />
                Actualizar Fecha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rechazo */}
      {showRejectModal && evidenceToReject && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Rechazar Evidencia</h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="reject-info">
                <p><strong>Archivo:</strong> {evidenceToReject.file_name}</p>
                <p><strong>Tarea:</strong> {evidenceToReject.task_title || 'Sin tarea'}</p>
                <p><strong>Fecha de entrega actual:</strong> {formatDate(evidenceToReject.delivery_date || evidenceToReject.created_at)}</p>
              </div>

              <div className="reject-form">
                <div className="reject-date-group">
                  <label className="reject-label">
                    Nueva fecha de entrega *
                  </label>
                  <input
                    type="date"
                    value={rejectDeliveryDate}
                    onChange={(e) => setRejectDeliveryDate(e.target.value)}
                    className="reject-date-input"
                  />
                </div>

                <label className="reject-label" style={{ marginTop: '0.5rem' }}>
                  Motivo del rechazo *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explica por qué se rechaza esta evidencia..."
                  className="reject-textarea"
                  rows="4"
                />
                <p className="reject-hint">Este mensaje será visible para el empleado.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-modal-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                className="btn-modal-reject"
                disabled={!rejectReason.trim() || !rejectDeliveryDate}
              >
                <XCircle size={16} />
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación aprobación */}
      {showApproveConfirm && evidenceToApprove && (
        <div className="confirm-overlay">
          <div className="confirm-modal approve">
            <div className="confirm-icon approve">
              <CheckCircle size={48} />
            </div>
            <h3>Confirmar aprobación</h3>
            <p>
              ¿Estás seguro de que deseas aprobar esta evidencia?
              <br />
              <span className="confirm-filename">{evidenceToApprove.file_name}</span>
            </p>
            <div className="confirm-buttons">
              <button className="confirm-btn-cancel" onClick={() => setShowApproveConfirm(false)}>
                Cancelar
              </button>
              <button className="confirm-btn-approve" onClick={confirmApprove}>
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}