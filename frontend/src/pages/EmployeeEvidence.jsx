import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { STATIC_URL } from '../services/api';
import Navbar from '../components/Navbar';
import { 
  FolderOpen, FileImage, Eye, ExternalLink, 
  X, AlertTriangle, File, Image, Video, FileText, 
  CheckCircle, XCircle, Clock, Upload, RefreshCw, Calendar
} from 'lucide-react';
import './EmployeeEvidence.css';

export default function EmployeeEvidence() {
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
  const [filterStatus, setFilterStatus] = useState('all');

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [evidenceToUpdate, setEvidenceToUpdate] = useState(null);
  const [newFile, setNewFile] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/employee/projects/');
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProject(response.data[0]);
        await fetchEvidence(response.data[0].id);
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
      applyFilters(allEvidence, filterStatus);
    } catch (error) {
      console.error('Error cargando evidencia:', error);
      setMessage({ text: 'Error al cargar evidencia', type: 'error' });
    } finally {
      setLoadingEvidence(false);
    }
  };

  const applyFilters = (data, status) => {
    let filtered = data;
    if (status !== 'all') {
      filtered = filtered.filter(e => e.status === status);
    }
    setFilteredEvidence(filtered);
  };

  const handleProjectChange = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project);
    await fetchEvidence(projectId);
    setFilterStatus('all');
  };

  const handleStatusFilterChange = (status) => {
    setFilterStatus(status);
    applyFilters(evidence, status);
  };

  const openEvidenceDetail = (evidence) => {
    setSelectedEvidence(evidence);
    setShowEvidenceModal(true);
  };

  const openUpdateModal = (evidence) => {
    setEvidenceToUpdate(evidence);
    setNewComment(evidence.comment || '');
    setNewFile(null);
    setShowUpdateModal(true);
  };

  const handleUpdateEvidence = async () => {
    if (!newFile && !newComment) {
      setMessage({ text: 'Debes subir un archivo o agregar un comentario', type: 'error' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    if (newFile) {
      formData.append('file', newFile);
    }
    if (newComment) {
      formData.append('comment', newComment);
    }

    try {
      await api.delete(`/tasks/evidence/${evidenceToUpdate.id}`);

      const response = await api.post(`/tasks/${evidenceToUpdate.task_id}/evidence`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({ text: 'Evidencia actualizada exitosamente', type: 'success' });
      setShowUpdateModal(false);
      setNewFile(null);
      setNewComment('');
      
      await fetchEvidence(selectedProject.id);
      
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: 'Error al actualizar evidencia', type: 'error' });
    } finally {
      setUploading(false);
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

      {/* ===== FONDO ULTRA LIGERO (ORBES AZULES) ===== */}
      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

      <div className="employee-evidence-container">
        <div className="evidence-header">
          <div className="evidence-header-content">
            <div className="evidence-title">
              <h1>Mis Evidencias</h1>
              <p>Visualiza el estado de tus evidencias y actualízalas si es necesario</p>
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
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobadas</option>
                  <option value="rejected">Rechazadas</option>
                </select>
              </div>
            </div>
          )}

          {!loading && !loadingEvidence && evidence.length > 0 && (
            <div className="evidence-counter">
              <span>Total: {evidence.length} evidencias</span>
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
              <p>Cargando evidencias...</p>
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="empty-state">
              <FileImage size={48} />
              <p className="empty-title">
                {filterStatus !== 'all' 
                  ? 'No se encontraron evidencias con este estado'
                  : 'No has subido evidencias en este proyecto'}
              </p>
              <p className="empty-subtitle">
                {filterStatus !== 'all' 
                  ? 'Prueba con otro filtro' 
                  : 'Sube evidencias desde la página de tareas'}
              </p>
            </div>
          ) : (
            <div className="evidence-grid">
              {filteredEvidence.map((item) => {
                const statusInfo = getStatusInfo(item.status);
                const isRejected = item.status === 'rejected';
                
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
                        <span>Subido: {formatDate(item.created_at)}</span>
                      </div>
                      <div className="evidence-delivery-date">
                        <Calendar size={12} />
                        <span>Fecha de entrega: {formatDate(item.delivery_date || item.created_at)}</span>
                      </div>
                      {item.comment && (
                        <div className="evidence-comment">Comentario: {item.comment}</div>
                      )}
                      {isRejected && item.review_comment && (
                        <div className="evidence-rejection">
                          <XCircle size={14} />
                          <span>Motivo del rechazo: {item.review_comment}</span>
                        </div>
                      )}
                    </div>

                    <div className="evidence-card-footer">
                      <div className="evidence-date">
                        {formatDate(item.created_at)}
                      </div>
                      <div className="evidence-actions">
                        <a
                          href={getFullUrl(item.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="evidence-btn-open"
                          title="Abrir en nueva pestaña"
                        >
                          <ExternalLink size={16} />
                        </a>
                        <button
                          onClick={() => openEvidenceDetail(item)}
                          className="evidence-btn-view"
                          title="Ver detalle"
                        >
                          <Eye size={16} />
                        </button>
                        {isRejected && (
                          <button
                            onClick={() => openUpdateModal(item)}
                            className="evidence-btn-update"
                            title="Actualizar evidencia"
                          >
                            <RefreshCw size={16} />
                          </button>
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

      {/* Modal de detalle */}
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
                  <span className="detail-label">Fecha de entrega:</span>
                  <span className="detail-value">{formatDate(selectedEvidence.delivery_date || selectedEvidence.created_at)}</span>
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
                    className="btn-open"
                  >
                    <ExternalLink size={16} />
                    Abrir en nueva pestaña
                  </a>
                </div>
                {selectedEvidence.status === 'rejected' && (
                  <div className="detail-row full">
                    <button
                      onClick={() => {
                        setShowEvidenceModal(false);
                        openUpdateModal(selectedEvidence);
                      }}
                      className="btn-update"
                    >
                      <RefreshCw size={16} />
                      Actualizar Evidencia
                    </button>
                  </div>
                )}
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

      {/* Modal para actualizar evidencia */}
      {showUpdateModal && evidenceToUpdate && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>Actualizar Evidencia</h2>
              <button className="modal-close" onClick={() => setShowUpdateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="update-info">
                <p><strong>Archivo anterior:</strong> {evidenceToUpdate.file_name}</p>
                <p><strong>Tarea:</strong> {evidenceToUpdate.task_title || 'Sin tarea'}</p>
                <p><strong>Fecha de entrega:</strong> {formatDate(evidenceToUpdate.delivery_date || evidenceToUpdate.created_at)}</p>
                {evidenceToUpdate.review_comment && (
                  <p className="update-rejection">
                    <strong>Motivo del rechazo:</strong> {evidenceToUpdate.review_comment}
                  </p>
                )}
                <p className="update-warning">
                  <AlertTriangle size={14} />
                  Al actualizar, la evidencia anterior será reemplazada completamente.
                </p>
              </div>

              <div className="update-form">
                <div className="file-upload-area">
                  <label className="file-upload-label">
                    <File size={24} />
                    <span>{newFile ? newFile.name : 'Seleccionar nuevo archivo (opcional)'}</span>
                    <input
                      type="file"
                      onChange={(e) => setNewFile(e.target.files[0])}
                      className="file-input"
                    />
                  </label>
                  <p className="file-hint">Sube una nueva versión del archivo (opcional)</p>
                </div>

                <textarea
                  placeholder="Nuevo comentario (opcional)"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="evidence-comment"
                  rows="3"
                />

                <div className="modal-footer">
                  <button
                    onClick={handleUpdateEvidence}
                    disabled={uploading || (!newFile && !newComment)}
                    className="btn-modal-primary"
                  >
                    {uploading ? 'Actualizando...' : <><RefreshCw size={16} /> Actualizar Evidencia</>}
                  </button>
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    className="btn-modal-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}