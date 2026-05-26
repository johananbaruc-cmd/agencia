import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, FolderPlus, LogOut, User, Users } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">
              Agencia MX
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center text-gray-700 hover:text-blue-600">
              <Home className="w-5 h-5 mr-1" />
              Dashboard
            </Link>
            {user?.role === 'admin' && (
              <>
                <Link to="/projects/new" className="flex items-center text-gray-700 hover:text-blue-600">
                  <FolderPlus className="w-5 h-5 mr-1" />
                  Nuevo Proyecto
                </Link>
                <Link to="/clients" className="flex items-center text-gray-700 hover:text-blue-600">
                  <Users className="w-5 h-5 mr-1" />
                  Clientes
                </Link>
              </>
            )}
            <div className="flex items-center ml-4">
              <User className="w-5 h-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-700">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="ml-4 flex items-center text-red-600 hover:text-red-700"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Salir
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <Link to="/dashboard" className="block py-2 text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>
            {user?.role === 'admin' && (
              <>
                <Link to="/projects/new" className="block py-2 text-gray-700 hover:text-blue-600">
                  Nuevo Proyecto
                </Link>
                <Link to="/clients" className="block py-2 text-gray-700 hover:text-blue-600">
                  Clientes
                </Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="block w-full text-left py-2 text-red-600 hover:text-red-700"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
