import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { STATIC_URL } from '../services/api';
import Navbar from '../components/Navbar';
import { 
  FolderOpen, CheckSquare, Clock, CheckCircle, AlertCircle, 
  Upload, File, X, Image, Video, FileText, 
  Eye, Trash2, Download, Maximize2, ExternalLink, AlertTriangle, Calendar
} from 'lucide-react';
import './EmployeeTasks.css';

export default function EmployeeTasks() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceComment, setEvidenceComment] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const [showEvidenceView, setShowEvidenceView] = useState(false);
  const [taskEvidence, setTaskEvidence] = useState([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // ✅ Estado para el modal de confirmación de eliminación
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [evidenceToDelete, setEvidenceToDelete] = useState(null);

  // ✅ Usar STATIC_URL importado (SIN /api/v1)
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${STATIC_URL}${url}`;
    return `${STATIC_URL}/${url}`;
  };

  // ✅ Formatear fecha
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
        fetchTasks(response.data[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (projectId) => {
    setLoading(true);
    try {
      const response = await api.get(`/tasks/projects/${projectId}/tasks`);
      const employeeTasks = response.data.filter(task => task.assigned_to === user?.id);
      setTasks(employeeTasks);
    } catch (error) {
      console.error('Error cargando tareas:', error);
      setMessage({ text: 'Error al cargar tareas', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidence = async (taskId) => {
    setLoadingEvidence(true);
    try {
      const response = await api.get(`/tasks/${taskId}/evidence`);
      setTaskEvidence(response.data);
    } catch (error) {
      console.error('Error cargando evidencia:', error);
    } finally {
      setLoadingEvidence(false);
    }
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project);
    fetchTasks(projectId);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
      setMessage({ text: '✅ Estado actualizado', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: '❌ Error al actualizar estado', type: 'error' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setEvidenceFile(file);
      setMessage({ 
        text: `📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 
        type: 'success' 
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleUploadEvidence = async (taskId) => {
    if (!evidenceFile) {
      setMessage({ text: '❌ Selecciona un archivo', type: 'error' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const startResponse = await api.post(`/tasks/${taskId}/evidence/chunk/start`, null, {
        params: {
          file_name: evidenceFile.name,
          file_size: evidenceFile.size
        }
      });

      const { upload_id, total_chunks } = startResponse.data;
      const CHUNK_SIZE = 5 * 1024 * 1024;

      let uploadedChunks = 0;

      for (let i = 0; i < total_chunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, evidenceFile.size);
        const chunk = evidenceFile.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunk_number', i);
        formData.append('upload_id', upload_id);

        await api.post(`/tasks/${taskId}/evidence/chunk`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const totalProgress = ((i * CHUNK_SIZE + progressEvent.loaded) / evidenceFile.size) * 100;
            setUploadProgress(Math.min(totalProgress, 100));
          },
        });

        uploadedChunks++;
        setUploadProgress((uploadedChunks / total_chunks) * 100);
      }

      const completeFormData = new FormData();
      completeFormData.append('upload_id', upload_id);
      if (evidenceComment) {
        completeFormData.append('comment', evidenceComment);
      }

      await api.post(`/tasks/${taskId}/evidence/chunk/complete`, completeFormData);

      setMessage({ text: '✅ Evidencia subida exitosamente', type: 'success' });
      setEvidenceFile(null);
      setEvidenceComment('');
      setShowEvidenceModal(false);
      setUploadProgress(0);

      if (showEvidenceView) {
        fetchEvidence(taskId);
      }

      setTimeout(() => setMessage({ text: '', type: '' }), 3000);

    } catch (error) {
      console.error('Error al subir evidencia:', error);
      setMessage({ text: '❌ Error al subir evidencia', type: 'error' });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // ✅ Nueva función para mostrar modal de confirmación
  const handleDeleteClick = (evidenceId) => {
    const evidence = taskEvidence.find(e => e.id === evidenceId);
    setEvidenceToDelete(evidence);
    setShowConfirmDelete(true);
  };

  // ✅ Confirmar eliminación
  const confirmDelete = async () => {
    if (!evidenceToDelete) return;
    
    try {
      await api.delete(`/tasks/evidence/${evidenceToDelete.id}`);
      setTaskEvidence(taskEvidence.filter(e => e.id !== evidenceToDelete.id));
      setMessage({ text: '✅ Evidencia eliminada', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: '❌ Error al eliminar evidencia', type: 'error' });
    } finally {
      setShowConfirmDelete(false);
      setEvidenceToDelete(null);
    }
  };

  const openEvidenceView = (task) => {
    setSelectedTask(task);
    setShowEvidenceView(true);
    fetchEvidence(task.id);
  };

  const getStatusText = (status) => {
    const map = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Finalizado'
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      completed: '#10b981'
    };
    return map[status] || '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const map = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };
    return map[priority] || '#6b7280';
  };

  const getPriorityLabel = (priority) => {
    const map = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return map[priority] || priority;
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

  const isViewableInBrowser = (fileName, fileType) => {
    if (fileType === 'image') return true;
    if (fileType === 'video') return true;
    if (fileType === 'audio') return true;
    if (fileType === 'document') {
      const ext = fileName?.split('.').pop()?.toLowerCase() || '';
      const viewableExtensions = ['pdf', 'txt', 'md', 'json', 'xml', 'html', 'htm', 'css', 'js', 'svg', 'csv'];
      return viewableExtensions.includes(ext);
    }
    return false;
  };

  const getFileExtension = (fileName) => {
    return fileName?.split('.').pop()?.toLowerCase() || '';
  };

  // ✅ Obtener el nombre del archivo para el modal de confirmación
  const getEvidenceFileName = () => {
    if (!evidenceToDelete) return '';
    return evidenceToDelete.file_name || 'Archivo';
  };

  return (
    <>
      <Navbar />
      <div className="employee-tasks-container">
        <div className="tasks-header">
          <div className="tasks-header-content">
            <div className="tasks-title">
              <h1>Mis Tareas</h1>
              <p>Gestiona tus tareas asignadas</p>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`message-floating ${message.type}`}>
            {message.text}
          </div>
        )}

        <main className="tasks-main">
          {projects.length > 0 && (
            <div className="project-selector">
              <label>Seleccionar Proyecto:</label>
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
          )}

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando tareas...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <CheckSquare size={48} />
              <p className="empty-title">No hay tareas asignadas</p>
              <p className="empty-subtitle">En este proyecto no tienes tareas asignadas</p>
            </div>
          ) : (
            <div className="tasks-list">
              {tasks.map((task) => (
                <div key={task.id} className="task-card">
                  <div className="task-header">
                    <div className="task-info">
                      <div className="task-title">{task.title}</div>
                      {task.description && (
                        <div className="task-description">{task.description}</div>
                      )}
                    </div>
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    >
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>

                  <div className="task-body">
                    <div className="task-status-section">
                      <span className="status-label">Estado:</span>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className="status-select"
                        style={{ 
                          borderColor: getStatusColor(task.status),
                          color: getStatusColor(task.status)
                        }}
                        disabled={updatingStatus}
                      >
                        <option value="pending">⏳ Pendiente</option>
                        <option value="in_progress">🔄 En Progreso</option>
                        <option value="completed">✅ Finalizado</option>
                      </select>
                    </div>

                    <div className="task-actions">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowEvidenceModal(true);
                        }}
                        className="btn-evidence"
                      >
                        <Upload size={16} />
                        Subir Evidencia
                      </button>
                      <button
                        onClick={() => openEvidenceView(task)}
                        className="btn-evidence-view"
                      >
                        <Eye size={16} />
                        Ver Evidencia
                      </button>
                    </div>
                  </div>

                  {/* ✅ FECHA DE ENTREGA DE LA TAREA */}
                  {task.due_date && (
                    <div className="task-footer">
                      <div className="task-due-date">
                        <Calendar size={14} />
                        <span>Fecha de entrega: {formatDate(task.due_date)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal para subir evidencia */}
      {showEvidenceModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowEvidenceModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>Subir Evidencia</h2>
              <button className="modal-close" onClick={() => setShowEvidenceModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="evidence-task-info">
                <p><strong>Tarea:</strong> {selectedTask.title}</p>
                <p><strong>Proyecto:</strong> {selectedProject?.name}</p>
                {selectedTask.due_date && (
                  <p><strong>Fecha de entrega:</strong> {formatDate(selectedTask.due_date)}</p>
                )}
              </div>

              <div className="evidence-form">
                <div className="file-upload-area">
                  <label className="file-upload-label">
                    <File size={24} />
                    <span>{evidenceFile ? evidenceFile.name : 'Seleccionar archivo'}</span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                  </label>
                  <p className="file-hint">Imágenes, videos, documentos (PDF, Word, Excel) - Sin límite de tamaño</p>
                </div>

                <textarea
                  placeholder="Comentario (opcional)"
                  value={evidenceComment}
                  onChange={(e) => setEvidenceComment(e.target.value)}
                  className="evidence-comment"
                  rows="3"
                />

                {uploading && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="progress-text">{Math.round(uploadProgress)}%</span>
                  </div>
                )}

                <div className="modal-footer">
                  <button
                    onClick={() => handleUploadEvidence(selectedTask.id)}
                    disabled={uploading || !evidenceFile}
                    className="btn-modal-primary"
                  >
                    {uploading ? 'Subiendo...' : <><Upload size={16} /> Subir Evidencia</>}
                  </button>
                  <button
                    onClick={() => {
                      setShowEvidenceModal(false);
                      setEvidenceFile(null);
                      setEvidenceComment('');
                    }}
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

      {/* Modal para ver evidencia */}
      {showEvidenceView && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowEvidenceView(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Evidencia de: {selectedTask.title}</h2>
              <button className="modal-close" onClick={() => setShowEvidenceView(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {loadingEvidence ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                </div>
              ) : taskEvidence.length === 0 ? (
                <div className="empty-state">
                  <File size={40} />
                  <p className="empty-title">No hay evidencia</p>
                  <p className="empty-subtitle">Aún no se ha subido evidencia para esta tarea</p>
                </div>
              ) : (
                <div className="evidence-list">
                  {taskEvidence.map((evidence) => {
                    const viewable = isViewableInBrowser(evidence.file_name, evidence.file_type);
                    
                    return (
                      <div key={evidence.id} className="evidence-item">
                        <div className="evidence-icon">
                          {getFileTypeIcon(evidence.file_type)}
                        </div>
                        <div className="evidence-info">
                          <div className="evidence-name">{evidence.file_name}</div>
                          <div className="evidence-meta">
                            <span>{getFileTypeLabel(evidence.file_type)}</span>
                            <span>•</span>
                            <span>{formatFileSize(evidence.file_size)}</span>
                            <span>•</span>
                            <span>Subido por: {evidence.uploaded_by_name || 'Usuario'}</span>
                            <span>•</span>
                            <span>{new Date(evidence.created_at).toLocaleDateString('es-MX')}</span>
                          </div>
                          {evidence.comment && (
                            <div className="evidence-comment-text">💬 {evidence.comment}</div>
                          )}
                        </div>
                        <div className="evidence-actions">
                          <a
                            href={getFullUrl(evidence.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="evidence-btn-open"
                            title="Abrir en nueva pestaña"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <button
                            onClick={() => handleDeleteClick(evidence.id)}
                            className="evidence-btn-delete"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setShowEvidenceView(false)}
                className="btn-modal-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL DE CONFIRMACIÓN DE ELIMINACIÓN PERSONALIZADO */}
      {showConfirmDelete && evidenceToDelete && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <div className="confirm-icon">
              <AlertTriangle size={48} />
            </div>
            <h3>Confirmar eliminación</h3>
            <p>
              ¿Estás seguro de que deseas eliminar esta evidencia?
              <br />
              <span className="confirm-filename">
                {getEvidenceFileName()}
              </span>
            </p>
            <p className="confirm-warning">Esta acción no se puede deshacer.</p>
            <div className="confirm-buttons">
              <button className="confirm-btn-cancel" onClick={() => setShowConfirmDelete(false)}>
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