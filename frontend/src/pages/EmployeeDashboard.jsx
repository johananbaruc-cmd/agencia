import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { FolderOpen, Clock, CheckCircle, FileUp, MessageCircle } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const fetchMyProjects = async () => {
    try {
      // Este endpoint debe devolver SOLO los proyectos asignados al empleado
      const response = await api.get('/employee/projects/');
      setProjects(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-title">
              <h1>Mis Proyectos</h1>
              <p>Bienvenido, {user?.name}</p>
            </div>
          </div>
        </div>

        <main className="dashboard-main">
          {loading ? (
            <div className="loading-state">Cargando tus proyectos...</div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={48} />
              <h3>No tienes proyectos asignados</h3>
              <p>Cuando te asignen un proyecto, aparecerá aquí</p>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <span className={`status-badge ${project.status}`}>
                      {project.status === 'in_progress' ? 'En Progreso' : 
                       project.status === 'completed' ? 'Completado' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="project-description">{project.description}</p>
                  <div className="project-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="project-actions">
                    <button className="btn-upload">
                      <FileUp size={16} />
                      Subir evidencia
                    </button>
                    <button className="btn-comment">
                      <MessageCircle size={16} />
                      Comentar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
