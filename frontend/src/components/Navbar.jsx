import { Link, useNavigate } from 'react-router-dom';
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
  Settings
} from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isEmployee = user?.role === 'employee';
  const isAdmin = user?.role === 'admin';

  const toggleEmployeesDropdown = () => {
    setIsEmployeesOpen(!isEmployeesOpen);
  };

  const toggleTasksDropdown = () => {
    setIsTasksOpen(!isTasksOpen);
  };

  const toggleReportsDropdown = () => {
    setIsReportsOpen(!isReportsOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        <Link to={isEmployee ? "/employee-dashboard" : "/dashboard"} className="navbar-logo">
          Agencia MX
        </Link>

        <div className="navbar-links">
          {isEmployee && (
            <>
              <Link to="/employee-dashboard" className="navbar-link">
                <Home size={16} />
                Dashboard
              </Link>

              <Link to="/employee-calendar" className="navbar-link">
                <Calendar size={16} />
                Calendario
              </Link>

              <div className="navbar-dropdown">
                <button 
                  className="navbar-dropdown-btn"
                  onClick={toggleTasksDropdown}
                >
                  <CheckSquare size={16} />
                  Tareas
                  <ChevronDown size={14} className={`dropdown-arrow ${isTasksOpen ? 'open' : ''}`} />
                </button>
                {isTasksOpen && (
                  <div className="navbar-dropdown-menu">
                    <Link to="/employee-tasks" className="dropdown-item">
                      <CheckSquare size={14} />
                      Mis Tareas
                    </Link>
                    <Link to="/employee-kanban" className="dropdown-item">
                      <LayoutGrid size={14} />
                      Kanban
                    </Link>
                    <Link to="/employee-evidence" className="dropdown-item">
                      <FileImage size={14} />
                      Evidencias
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {isAdmin && (
            <>
              <Link to="/dashboard" className="navbar-link">
                <Home size={16} />
                Dashboard
              </Link>
              <Link to="/projects/new" className="navbar-link">
                <FolderPlus size={16} />
                Nuevo
              </Link>

              <Link to="/clients" className="navbar-link">
                <Users size={16} />
                Clientes
              </Link>

              <Link to="/admin-calendar" className="navbar-link">
                <Calendar size={16} />
                Calendario
              </Link>

              <div className="navbar-dropdown">
                <button 
                  className="navbar-dropdown-btn"
                  onClick={toggleEmployeesDropdown}
                >
                  <User size={16} />
                  Empleados
                  <ChevronDown size={14} className={`dropdown-arrow ${isEmployeesOpen ? 'open' : ''}`} />
                </button>
                {isEmployeesOpen && (
                  <div className="navbar-dropdown-menu">
                    <Link to="/employees" className="dropdown-item">
                      <User size={14} />
                      Empleados
                    </Link>
                    <Link to="/admin-evidence" className="dropdown-item">
                      <FileImage size={14} />
                      Evidencias
                    </Link>
                  </div>
                )}
              </div>

              {/* Dropdown de Reportes */}
              <div className="navbar-dropdown">
                <button 
                  className="navbar-dropdown-btn"
                  onClick={toggleReportsDropdown}
                >
                  <FileText size={16} />
                  Reportes
                  <ChevronDown size={14} className={`dropdown-arrow ${isReportsOpen ? 'open' : ''}`} />
                </button>
                {isReportsOpen && (
                  <div className="navbar-dropdown-menu">
                    <Link to="/reportes/proyectos" className="dropdown-item">
                      <FileText size={14} />
                      Reportes por Proyecto
                    </Link>
                    <Link to="/reportes/crear" className="dropdown-item">
                      <FileText size={14} />
                      Crear Reporte
                    </Link>
                    <Link to="/reportes/gestion" className="dropdown-item">
                      <Settings size={14} />
                      Gestionar Reportes
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="navbar-user">
            <User size={16} />
            <span>{user?.name}</span>
            <button onClick={handleLogout} className="navbar-logout">
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>

        <button 
          className="navbar-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          ☰
        </button>
      </div>

      {isMenuOpen && (
        <div className="navbar-mobile">
          {isEmployee && (
            <>
              <Link to="/employee-dashboard" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
              <Link to="/employee-calendar" onClick={() => setIsMenuOpen(false)}>Calendario</Link>
              <div className="navbar-mobile-submenu">
                <div className="navbar-mobile-submenu-title">Tareas</div>
                <Link to="/employee-tasks" onClick={() => setIsMenuOpen(false)}>• Mis Tareas</Link>
                <Link to="/employee-kanban" onClick={() => setIsMenuOpen(false)}>• Kanban</Link>
                <Link to="/employee-evidence" onClick={() => setIsMenuOpen(false)}>• Evidencias</Link>
              </div>
            </>
          )}

          {isAdmin && (
            <>
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
              <Link to="/projects/new" onClick={() => setIsMenuOpen(false)}>Nuevo Proyecto</Link>
              <Link to="/clients" onClick={() => setIsMenuOpen(false)}>Clientes</Link>
              <Link to="/admin-calendar" onClick={() => setIsMenuOpen(false)}>Calendario</Link>
              
              <div className="navbar-mobile-submenu">
                <div className="navbar-mobile-submenu-title">Empleados</div>
                <Link to="/employees" onClick={() => setIsMenuOpen(false)}>• Empleados</Link>
                <Link to="/admin-evidence" onClick={() => setIsMenuOpen(false)}>• Evidencias</Link>
              </div>

              <div className="navbar-mobile-submenu">
                <div className="navbar-mobile-submenu-title">Reportes</div>
                <Link to="/reportes/proyectos" onClick={() => setIsMenuOpen(false)}>• Reportes por Proyecto</Link>
                <Link to="/reportes/crear" onClick={() => setIsMenuOpen(false)}>• Crear Reporte</Link>
                <Link to="/reportes/gestion" onClick={() => setIsMenuOpen(false)}>• Gestionar Reportes</Link>
              </div>
            </>
          )}

          <button onClick={handleLogout} className="mobile-logout">Salir</button>
        </div>
      )}
    </nav>
  );
}