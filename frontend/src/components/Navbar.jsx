import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, FolderPlus, LogOut, User, Users, LayoutGrid, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isEmployee = user?.role === 'employee';
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        <Link to={isEmployee ? "/employee-dashboard" : "/dashboard"} className="navbar-logo">
          Agencia MX
        </Link>

        <div className="navbar-links">
          {/* Dashboard - según el rol */}
          <Link to={isEmployee ? "/employee-dashboard" : "/dashboard"} className="navbar-link">
            <Home size={16} />
            Dashboard
          </Link>

          {/* Empleado: Mis Tareas y Kanban */}
          {isEmployee && (
            <>
              <Link to="/employee-tasks" className="navbar-link">
                <CheckSquare size={16} />
                Mis Tareas
              </Link>
              <Link to="/employee-kanban" className="navbar-link">
                <LayoutGrid size={16} />
                Kanban
              </Link>
            </>
          )}

          {/* Admin: opciones de admin */}
          {isAdmin && (
            <>
              <Link to="/projects/new" className="navbar-link">
                <FolderPlus size={16} />
                Nuevo
              </Link>

              <Link to="/clients" className="navbar-link">
                <Users size={16} />
                Clientes
              </Link>

              <Link to="/employees" className="navbar-link">
                <User size={16} />
                Empleados
              </Link>
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
          <Link to={isEmployee ? "/employee-dashboard" : "/dashboard"} onClick={() => setIsMenuOpen(false)}>
            Dashboard
          </Link>

          {isEmployee && (
            <>
              <Link to="/employee-tasks" onClick={() => setIsMenuOpen(false)}>Mis Tareas</Link>
              <Link to="/employee-kanban" onClick={() => setIsMenuOpen(false)}>Kanban</Link>
            </>
          )}

          {isAdmin && (
            <>
              <Link to="/projects/new" onClick={() => setIsMenuOpen(false)}>Nuevo Proyecto</Link>
              <Link to="/clients" onClick={() => setIsMenuOpen(false)}>Clientes</Link>
              <Link to="/employees" onClick={() => setIsMenuOpen(false)}>Empleados</Link>
            </>
          )}

          <button onClick={handleLogout}>Salir</button>
        </div>
      )}
    </nav>
  );
}