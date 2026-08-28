import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import KanbanBoardTasks from '../components/KanbanBoardTasks';
import { LayoutGrid, FolderOpen } from 'lucide-react';
import './EmployeeKanban.css';

export default function EmployeeKanban() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project);
    fetchTasks(projectId);
  };

  const refreshTasks = async () => {
    if (selectedProject) {
      await fetchTasks(selectedProject.id);
    }
  };

  return (
    <>
      <Navbar />

      {/* ===== FONDO ULTRA LIGERO (ORBES AZULES) ===== */}
      <div className="orb orb-blue"></div>
      <div className="orb orb-cyan"></div>
      <div className="bg-gradient"></div>

      <div className="employee-kanban-container">
        <div className="kanban-header">
          <div className="kanban-header-content">
            <div className="kanban-title">
              <h1>Kanban de Tareas</h1>
              <p>Visualiza y organiza tus tareas por estado</p>
            </div>
          </div>
        </div>

        <main className="kanban-main">
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

          {/* Kanban Board */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando tareas...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <LayoutGrid size={48} />
              <p className="empty-title">No hay tareas</p>
              <p className="empty-subtitle">No tienes tareas asignadas en este proyecto</p>
            </div>
          ) : (
            <div className="kanban-wrapper">
              <div className="kanban-board-container">
                <KanbanBoardTasks 
                  tasks={tasks}
                  onTaskUpdate={refreshTasks}
                  readOnly={false}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}