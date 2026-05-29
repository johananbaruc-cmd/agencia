import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, FolderPlus, LogOut, User, Users } from 'lucide-react';
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

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* LOGO */}
        <Link to="/dashboard" className="navbar-logo">
          Agencia MX
        </Link>

        {/* DESKTOP */}
        <div className="navbar-links">
          
          <Link to="/dashboard" className="navbar-link">
            <Home size={16} />
            Dashboard
          </Link>

          {user?.role === 'admin' && (
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

          {/* USER */}
          <div className="navbar-user">
            <User size={16} />
            <span>{user?.name}</span>

            <button onClick={handleLogout} className="navbar-logout">
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </div>

        {/* MOBILE */}
        <button 
          className="navbar-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <div className="navbar-mobile">

          <Link to="/dashboard">Dashboard</Link>

          {user?.role === 'admin' && (
            <>
              <Link to="/projects/new">Nuevo Proyecto</Link>
              <Link to="/clients">Clientes</Link>
            </>
          )}

          <button onClick={handleLogout}>Salir</button>
        </div>
      )}
    </nav>
  );
}