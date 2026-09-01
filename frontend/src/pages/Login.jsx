import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Mail, Lock, LogIn, UserPlus, KeyRound, ArrowLeft, CheckCircle, Eye, EyeOff, Building2, User, Hash } from "lucide-react";
import ChangePasswordModal from "../components/ChangePasswordModal";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const [registerData, setRegisterData] = useState({
    agency_name: '',
    agency_email: '',
    agency_rfc: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    confirmPassword: ''
  });
  
  const [forgotEmail, setForgotEmail] = useState('');
  
  const [registerLoading, setRegisterLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

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
          const userRole = result.user?.role || localStorage.getItem('userRole');
          if (userRole === 'admin') navigate('/dashboard');
          else if (userRole === 'employee') navigate('/employee-dashboard');
          else navigate('/dashboard');
        }
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Error de conexión: ' + error.message);
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerData.admin_password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (registerData.admin_password !== registerData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setRegisterLoading(true);
    try {
      const url = `${API_URL}/auth/register`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          agency_name: registerData.agency_name.trim(),
          agency_email: registerData.agency_email.trim().toLowerCase(),
          agency_rfc: registerData.agency_rfc.trim().toUpperCase(),
          admin_name: registerData.admin_name.trim(),
          admin_email: registerData.admin_email.trim().toLowerCase(),
          admin_password: registerData.admin_password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        toast.error(errorMsg || 'Error al crear la agencia');
        setRegisterLoading(false);
        return;
      }
      setRegisterSuccess(true);
      toast.success('¡Agencia y administrador creados exitosamente!');
      setTimeout(() => {
        setShowRegister(false);
        setRegisterSuccess(false);
        setRegisterData({
          agency_name: '', agency_email: '', agency_rfc: '',
          admin_name: '', admin_email: '', admin_password: '', confirmPassword: ''
        });
        setEmail(registerData.admin_email);
      }, 2500);
    } catch (error) {
      toast.error('Error de conexión: ' + error.message);
    }
    setRegisterLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.detail || 'Error al enviar solicitud');
        setForgotLoading(false);
        return;
      }
      setForgotSuccess(true);
      toast.success('Revisa tu correo para restablecer tu contraseña');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotSuccess(false);
        setForgotEmail('');
      }, 3000);
    } catch (error) {
      toast.error('Error de conexión: ' + error.message);
    }
    setForgotLoading(false);
  };

  const goBackToLogin = () => {
    setShowRegister(false);
    setShowForgotPassword(false);
    setRegisterSuccess(false);
    setForgotSuccess(false);
    setRegisterData({
      agency_name: '', agency_email: '', agency_rfc: '',
      admin_name: '', admin_email: '', admin_password: '', confirmPassword: ''
    });
    setForgotEmail('');
  };

  // ===== LOGIN (Sin scroll, cabe perfecto) =====
  if (!showRegister && !showForgotPassword) {
    return (
      <div className="page-wrapper">
        {/* Fondo ultra ligero, estático */}
        <div className="orb orb-blue"></div>
        <div className="orb orb-cyan"></div>
        <div className="bg-gradient"></div>

        <div className="login-container login-no-scroll">
          <div className="login-glow-wrap" key="login">
            <div className="login-card">
              <div className="login-icon"><LogIn size={24} /></div>
              <h1 className="login-title">Agencia MX</h1>
              <p className="login-subtitle">Inicia sesión en tu cuenta</p>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label className="input-label">Correo electrónico</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" size={18} />
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field"  />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Contraseña</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field"  />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-liquid">
                  <span className="btn-liquid-content">
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </span>
                </button>

                <div className="login-links">
                  <button type="button" onClick={() => setShowRegister(true)} className="login-link-btn"><UserPlus size={16} /> Crear agencia</button>
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="login-link-btn"><KeyRound size={16} /> ¿Olvidaste tu contraseña?</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <ChangePasswordModal
          isOpen={showChangePassword}
          forced={true}
          onClose={() => { setShowChangePassword(false); const userRole = localStorage.getItem('userRole'); if (userRole === 'employee') navigate('/employee-dashboard'); else navigate('/dashboard'); }}
          onSuccess={() => { toast.success('Contraseña actualizada'); const userRole = localStorage.getItem('userRole'); if (userRole === 'employee') navigate('/employee-dashboard'); else navigate('/dashboard'); }}
        />
      </div>
    );
  }

  // ===== REGISTRO (Con scroll interno) =====
  if (showRegister) {
    return (
      <div className="page-wrapper">
        <div className="orb orb-blue"></div>
        <div className="orb orb-cyan"></div>
        <div className="bg-gradient"></div>

        <div className="login-container login-scroll">
          <div className="login-glow-wrap" key="register">
            <div className="login-card login-card-scroll">
              <button onClick={goBackToLogin} className="login-back-btn"><ArrowLeft size={18} /> Volver al login</button>
              <div className="login-icon"><Building2 size={24} /></div>
              <h1 className="login-title">Crear Agencia</h1>
              <p className="login-subtitle">Registra tu agencia y administrador</p>
              {registerSuccess ? (
                <div className="register-success"><CheckCircle size={48} className="text-green-500" /><p>¡Agencia creada exitosamente!</p><p className="text-sm text-gray-400">Redirigiendo al login...</p></div>
              ) : (
                <form onSubmit={handleRegister}>
                  <div className="form-divider"><span className="form-divider-text">Datos de la agencia</span></div>
                  <div className="input-group">
                    <label className="input-label">Nombre de la agencia</label>
                    <div className="input-wrapper"><Building2 className="input-icon" size={18} /><input type="text" required value={registerData.agency_name} onChange={(e) => setRegisterData({ ...registerData, agency_name: e.target.value })} className="input-field"  /></div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Correo de la agencia</label>
                    <div className="input-wrapper"><Mail className="input-icon" size={18} /><input type="email" required value={registerData.agency_email} onChange={(e) => setRegisterData({ ...registerData, agency_email: e.target.value })} className="input-field"  /></div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">RFC</label>
                    <div className="input-wrapper"><Hash className="input-icon" size={18} /><input type="text" required value={registerData.agency_rfc} onChange={(e) => setRegisterData({ ...registerData, agency_rfc: e.target.value.toUpperCase() })} className="input-field"  maxLength={13} /></div>
                    <p className="input-hint">RFC de persona física (13 caracteres) o moral (12 caracteres)</p>
                  </div>
                  <div className="form-divider"><span className="form-divider-text">Datos del administrador</span></div>
                  <div className="input-group">
                    <label className="input-label">Nombre del administrador</label>
                    <div className="input-wrapper"><User className="input-icon" size={18} /><input type="text" required value={registerData.admin_name} onChange={(e) => setRegisterData({ ...registerData, admin_name: e.target.value })} className="input-field"  /></div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Correo del administrador</label>
                    <div className="input-wrapper"><Mail className="input-icon" size={18} /><input type="email" required value={registerData.admin_email} onChange={(e) => setRegisterData({ ...registerData, admin_email: e.target.value })} className="input-field"  /></div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Contraseña</label>
                    <div className="input-wrapper"><Lock className="input-icon" size={18} /><input type={showRegPassword ? 'text' : 'password'} required value={registerData.admin_password} onChange={(e) => setRegisterData({ ...registerData, admin_password: e.target.value })} className="input-field"  /><button type="button" className="login-eye-btn" onClick={() => setShowRegPassword(!showRegPassword)}>{showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Confirmar contraseña</label>
                    <div className="input-wrapper"><Lock className="input-icon" size={18} /><input type={showRegConfirm ? 'text' : 'password'} required value={registerData.confirmPassword} onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })} className="input-field"  /><button type="button" className="login-eye-btn" onClick={() => setShowRegConfirm(!showRegConfirm)}>{showRegConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                    {registerData.confirmPassword && registerData.confirmPassword !== registerData.admin_password && (<p className="input-error">Las contraseñas no coinciden</p>)}
                  </div>

                  <button type="submit" disabled={registerLoading || (registerData.confirmPassword && registerData.confirmPassword !== registerData.admin_password)} className="btn-liquid">
                    <span className="btn-liquid-content">
                      {registerLoading ? 'Creando agencia...' : 'Crear agencia'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== RECUPERAR CONTRASEÑA (Sin scroll) =====
  if (showForgotPassword) {
    return (
      <div className="page-wrapper">
        <div className="orb orb-blue"></div>
        <div className="orb orb-cyan"></div>
        <div className="bg-gradient"></div>

        <div className="login-container login-no-scroll">
          <div className="login-glow-wrap" key="forgot">
            <div className="login-card">
              <button onClick={goBackToLogin} className="login-back-btn"><ArrowLeft size={18} /> Volver al login</button>
              <div className="login-icon"><KeyRound size={24} /></div>
              <h1 className="login-title">Recuperar contraseña</h1>
              <p className="login-subtitle">Te enviaremos un enlace para restablecer tu contraseña</p>
              {forgotSuccess ? (
                <div className="register-success"><CheckCircle size={48} className="text-green-500" /><p>¡Revisa tu correo!</p><p className="text-sm text-gray-400">Hemos enviado un enlace para restablecer tu contraseña</p></div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <div className="input-group">
                    <label className="input-label">Correo electrónico</label>
                    <div className="input-wrapper"><Mail className="input-icon" size={18} /><input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="input-field"  /></div>
                  </div>
                  <button type="submit" disabled={forgotLoading} className="btn-liquid">
                    <span className="btn-liquid-content">
                      {forgotLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}