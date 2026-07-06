import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { FolderOpen, CheckSquare, Clock, CheckCircle, AlertCircle, Upload, File, X, Send } from 'lucide-react';
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
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      // Filtrar tareas asignadas al empleado actual
      const employeeTasks = response.data.filter(task => task.assigned_to === user?.id);
      setTasks(employeeTasks);
    } catch (error) {
      console.error('Error cargando tareas:', error);
      setMessage({ text: 'Error al cargar tareas', type: 'error' });
    } finally {
      setLoading(false);
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
      setEvidenceFile(e.target.files[0]);
    }
  };

  const handleUploadEvidence = async (taskId) => {
    if (!evidenceFile) {
      setMessage({ text: '❌ Selecciona un archivo', type: 'error' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', evidenceFile);
    if (evidenceComment) {
      formData.append('comment', evidenceComment);
    }

    try {
      await api.post(`/tasks/${taskId}/evidence`, formData);
      setMessage({ text: '✅ Evidencia subida exitosamente', type: 'success' });
      setEvidenceFile(null);
      setEvidenceComment('');
      setShowEvidenceModal(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ text: '❌ Error al subir evidencia', type: 'error' });
    } finally {
      setUploading(false);
    }
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

  const getStatusIcon = (status) => {
    const map = {
      pending: <Clock size={16} style={{ color: '#f59e0b' }} />,
      in_progress: <AlertCircle size={16} style={{ color: '#3b82f6' }} />,
      completed: <CheckCircle size={16} style={{ color: '#10b981' }} />
    };
    return map[status] || <Clock size={16} />;
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
          {/* Selector de proyecto */}
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

          {/* Lista de tareas */}
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal para subir evidencia */}
      {showEvidenceModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowEvidenceModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
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
                </div>

                <textarea
                  placeholder="Comentario (opcional)"
                  value={evidenceComment}
                  onChange={(e) => setEvidenceComment(e.target.value)}
                  className="evidence-comment"
                  rows="3"
                />

                <div className="modal-footer">
                  <button
                    onClick={() => handleUploadEvidence(selectedTask.id)}
                    disabled={uploading || !evidenceFile}
                    className="btn-modal-primary"
                  >
                    {uploading ? 'Subiendo...' : <><Upload size={16} /> Subir Evidencia</>}
                  </button>
                  <button
                    onClick={() => setShowEvidenceModal(false)}
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