import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.must_change_password) {
          localStorage.setItem('temp_password', password);
          setShowChangePassword(true);
        } else {
          toast.success('Bienvenido');
          
          // 🔥 REDIRECCIÓN SEGÚN EL ROL 🔥
          const userRole = result.user?.role || localStorage.getItem('userRole');
          
          if (userRole === 'admin') {
            navigate('/dashboard');
          } else if (userRole === 'employee') {
            navigate('/employee-dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Error de conexión: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="login-container">
        <div className="login-card">
          <div className="login-icon">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="login-title">Agencia MX</h1>
          <p className="login-subtitle">Inicia sesión en tu cuenta</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Correo electrónico</label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="admin@miagencia.com"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        forced={true}
        onClose={() => {
          setShowChangePassword(false);
          const userRole = localStorage.getItem('userRole');
          if (userRole === 'employee') {
            navigate('/employee-dashboard');
          } else {
            navigate('/dashboard');
          }
        }}
        onSuccess={() => {
          toast.success('Contraseña actualizada');
          const userRole = localStorage.getItem('userRole');
          if (userRole === 'employee') {
            navigate('/employee-dashboard');
          } else {
            navigate('/dashboard');
          }
        }}
      />
    </>
  );
}