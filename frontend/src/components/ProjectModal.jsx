import { useState } from 'react';
import { X, Calendar, DollarSign, User, FileText, Edit, Trash2 } from 'lucide-react';

export default function ProjectModal({ 
  project, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  if (!isOpen || !project) return null;

  const getStatusText = (status) => {
    const map = {
      pending: 'Pendiente',
      in_progress: 'En Desarrollo',
      completed: 'Finalizado',
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const map = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      completed: '#10b981',
    };
    return map[status] || '#6b7280';
  };

  const handleEdit = () => {
    onClose();
    if (onEdit) onEdit(project);
  };

  const handleDeleteClick = () => {
    setProjectToDelete({ id: project.id, name: project.name });
    setShowConfirmModal(true);
  };

  const confirmDelete = () => {
    if (projectToDelete && onDelete) {
      onDelete(projectToDelete.id, projectToDelete.name);
      setShowConfirmModal(false);
      setProjectToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setProjectToDelete(null);
  };

  return (
    <>
      <div className="project-modal-overlay" onClick={onClose}>
        <div className="project-modal" onClick={(e) => e.stopPropagation()}>
          <div className="project-modal-header">
            <h2>{project.name}</h2>
            <button className="project-modal-close" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className="project-modal-body">
            {/* Estado */}
            <div className="project-modal-status">
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(project.status) }}
              >
                {getStatusText(project.status)}
              </span>
            </div>

            <div className="project-modal-details">
              <div className="detail-item">
                <DollarSign size={18} />
                <div>
                  <label>Presupuesto</label>
                  <span>${project.budget?.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>

              <div className="detail-item">
                <User size={18} />
                <div>
                  <label>Cliente</label>
                  <span>{project.client_name || 'Sin cliente'}</span>
                </div>
              </div>

              {project.start_date && (
                <div className="detail-item">
                  <Calendar size={18} />
                  <div>
                    <label>Fecha inicio</label>
                    <span>{new Date(project.start_date).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
              )}

              {project.end_date && (
                <div className="detail-item">
                  <Calendar size={18} />
                  <div>
                    <label>Fecha entrega</label>
                    <span>{new Date(project.end_date).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
              )}

              {project.description && (
                <div className="detail-item full">
                  <FileText size={18} />
                  <div>
                    <label>Descripción</label>
                    <span>{project.description}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="project-modal-actions">
              <button
                className="modal-action-btn modal-action-edit"
                onClick={handleEdit}
              >
                <Edit size={16} />
                Editar Proyecto
              </button>
              <button
                className="modal-action-btn modal-action-delete"
                onClick={handleDeleteClick}
              >
                <Trash2 size={16} />
                Eliminar Proyecto
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      {showConfirmModal && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <h3>Confirmar eliminación</h3>
            <p>¿Estás seguro de que deseas eliminar el proyecto <strong>{projectToDelete?.name}</strong>?</p>
            <div className="confirm-buttons">
              <button className="confirm-btn-delete" onClick={confirmDelete}>
                Eliminar
              </button>
              <button className="confirm-btn-cancel" onClick={cancelDelete}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}