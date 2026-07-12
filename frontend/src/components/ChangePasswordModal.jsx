import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import './ChangePasswordModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ChangePasswordModal({ isOpen, onClose, onSuccess, forced = false }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const tempPassword = localStorage.getItem('temp_password') || '';

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const map = [
      { level: 0, label: '', color: '' },
      { level: 1, label: 'Débil', color: '#ef4444' },
      { level: 2, label: 'Regular', color: '#f97316' },
      { level: 3, label: 'Buena', color: '#eab308' },
      { level: 4, label: 'Fuerte', color: '#22c55e' },
    ];
    return map[score] || map[0];
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPassword === (currentPassword || tempPassword)) {
      toast.error('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword || tempPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'Error al cambiar la contraseña');
        setLoading(false);
        return;
      }

      localStorage.removeItem('temp_password');
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (error) {
      toast.error('Error de conexión: ' + error.message);
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (forced) {
      toast('Debes cambiar tu contraseña para continuar', { icon: '🔒' });
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose?.();
  };

  return (
    <div className="cpm-overlay" onClick={forced ? undefined : handleClose}>
      <div className="cpm-card" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="cpm-header">
          <div className="cpm-icon">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="cpm-title">
              {forced ? 'Cambia tu contraseña temporal' : 'Cambiar contraseña'}
            </h2>
            <p className="cpm-subtitle">
              {forced
                ? 'Por seguridad, debes crear una contraseña personal antes de continuar.'
                : 'Actualiza tu contraseña cuando quieras.'}
            </p>
          </div>
          {!forced && (
            <button className="cpm-close" onClick={handleClose} aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="cpm-form">

          {/* Contraseña actual */}
          <div className="cpm-field">
            <label className="cpm-label">
              {forced ? 'Contraseña temporal' : 'Contraseña actual'}
            </label>
            <div className="cpm-input-wrapper">
              <Lock className="cpm-input-icon" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={forced ? tempPassword : currentPassword}
                onChange={(e) => !forced && setCurrentPassword(e.target.value)}
                readOnly={forced && !!tempPassword}
                className={`cpm-input ${forced && tempPassword ? 'cpm-input--readonly' : ''}`}
                placeholder={forced ? '(detectada automáticamente)' : 'Tu contraseña actual'}
                autoComplete="current-password"
              />
              {(!forced || !tempPassword) && (
                <button
                  type="button"
                  className="cpm-eye"
                  onClick={() => setShowCurrent(!showCurrent)}
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
            {forced && tempPassword && (
              <p className="cpm-hint">✓ Contraseña temporal detectada desde tu sesión</p>
            )}
          </div>

          {/* Nueva contraseña */}
          <div className="cpm-field">
            <label className="cpm-label">Nueva contraseña</label>
            <div className="cpm-input-wrapper">
              <Lock className="cpm-input-icon" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="cpm-input"
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="cpm-eye"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Indicador de fortaleza */}
            {newPassword && (
              <div className="cpm-strength">
                <div className="cpm-strength-bars">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="cpm-strength-bar"
                      style={{
                        backgroundColor:
                          n <= strength.level ? strength.color : 'var(--cpm-bar-empty)',
                      }}
                    />
                  ))}
                </div>
                <span className="cpm-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div className="cpm-field">
            <label className="cpm-label">Confirmar nueva contraseña</label>
            <div className="cpm-input-wrapper">
              <Lock className="cpm-input-icon" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`cpm-input ${
                  confirmPassword && confirmPassword !== newPassword ? 'cpm-input--error' : ''
                } ${
                  confirmPassword && confirmPassword === newPassword ? 'cpm-input--ok' : ''
                }`}
                placeholder="Repite la nueva contraseña"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="cpm-eye"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="cpm-error-msg">Las contraseñas no coinciden</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !!(confirmPassword && confirmPassword !== newPassword)}
            className="cpm-submit"
          >
            {loading ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>

        </form>
      </div>
    </div>
  );
}