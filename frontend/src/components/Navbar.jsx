import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  FolderPlus, 
  LogOut, 
  User, 
  Users, 
  LayoutGrid, 
  CheckSquare, 
  FileImage, 
  ChevronDown, 
  Calendar,
  FileText,
  Settings,
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isEmployee = user?.role === 'employee';
  const isAdmin = user?.role === 'admin';

  // Función para verificar si una ruta está activa
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-inner">
        
        {/* EL LOGO "A" FUE ELIMINADO */}

        <div className="sidebar-links">
          {isEmployee && (
            <>
              <Link to="/employee-dashboard" className={`sidebar-link ${isActive('/employee-dashboard') ? 'active' : ''}`} data-tooltip="Dashboard">
                <Home size={20} />
              </Link>

              <Link to="/employee-calendar" className={`sidebar-link ${isActive('/employee-calendar') ? 'active' : ''}`} data-tooltip="Calendario">
                <Calendar size={20} />
              </Link>

              <button 
                className={`sidebar-link ${isTasksOpen ? 'active' : ''}`}
                onClick={() => setIsTasksOpen(!isTasksOpen)}
                data-tooltip="Tareas"
              >
                <CheckSquare size={20} />
                <ChevronDown size={12} className="sidebar-dropdown-arrow" />
              </button>

              {isTasksOpen && (
                <div className="sidebar-dropdown">
                  <Link to="/employee-tasks" className="sidebar-dropdown-item" data-tooltip="Mis Tareas">
                    <CheckSquare size={16} />
                  </Link>
                  <Link to="/employee-kanban" className="sidebar-dropdown-item" data-tooltip="Kanban">
                    <LayoutGrid size={16} />
                  </Link>
                  <Link to="/employee-evidence" className="sidebar-dropdown-item" data-tooltip="Evidencias">
                    <FileImage size={16} />
                  </Link>
                </div>
              )}
            </>
          )}

          {isAdmin && (
            <>
              <Link to="/dashboard" className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`} data-tooltip="Dashboard">
                <Home size={20} />
              </Link>

              <Link to="/dashboard-analisis" className={`sidebar-link ${isActive('/dashboard-analisis') ? 'active' : ''}`} data-tooltip="Análisis">
                <BarChart3 size={20} />
              </Link>

              <Link to="/projects/new" className={`sidebar-link ${isActive('/projects/new') ? 'active' : ''}`} data-tooltip="Nuevo Proyecto">
                <FolderPlus size={20} />
              </Link>

              <Link to="/clients" className={`sidebar-link ${isActive('/clients') ? 'active' : ''}`} data-tooltip="Clientes">
                <Users size={20} />
              </Link>

              <Link to="/admin-calendar" className={`sidebar-link ${isActive('/admin-calendar') ? 'active' : ''}`} data-tooltip="Calendario">
                <Calendar size={20} />
              </Link>

              <button 
                className={`sidebar-link ${isEmployeesOpen ? 'active' : ''}`}
                onClick={() => setIsEmployeesOpen(!isEmployeesOpen)}
                data-tooltip="Empleados"
              >
                <User size={20} />
                <ChevronDown size={12} className="sidebar-dropdown-arrow" />
              </button>

              {isEmployeesOpen && (
                <div className="sidebar-dropdown">
                  <Link to="/employees" className="sidebar-dropdown-item" data-tooltip="Empleados">
                    <User size={16} />
                  </Link>
                  <Link to="/admin-evidence" className="sidebar-dropdown-item" data-tooltip="Evidencias">
                    <FileImage size={16} />
                  </Link>
                </div>
              )}

              <button 
                className={`sidebar-link ${isReportsOpen ? 'active' : ''}`}
                onClick={() => setIsReportsOpen(!isReportsOpen)}
                data-tooltip="Reportes"
              >
                <FileText size={20} />
                <ChevronDown size={12} className="sidebar-dropdown-arrow" />
              </button>

              {isReportsOpen && (
                <div className="sidebar-dropdown">
                  <Link to="/reportes/proyectos" className="sidebar-dropdown-item" data-tooltip="Por Proyecto">
                    <FileText size={16} />
                  </Link>
                  <Link to="/reportes/crear" className="sidebar-dropdown-item" data-tooltip="Crear Reporte">
                    <FileText size={16} />
                  </Link>
                  <Link to="/reportes/gestion" className="sidebar-dropdown-item" data-tooltip="Gestionar">
                    <Settings size={16} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user" data-tooltip={user?.name || 'Usuario'}>
            <User size={20} />
          </div>
          <button onClick={handleLogout} className="sidebar-logout" data-tooltip="Salir">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}