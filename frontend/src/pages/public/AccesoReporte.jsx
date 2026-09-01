import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Lock, 
  Unlock, 
  XCircle, 
  CheckCircle, 
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  MailQuestion
} from 'lucide-react';
import api from '../../services/api';
import './AccesoReporte.css';

const AccesoReporte = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [estadoCandado, setEstadoCandado] = useState('locked'); // locked | unlocking | unlocked | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const codigoLimpio = codigo.trim().toUpperCase();
      
      const codigoRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      if (!codigoRegex.test(codigoLimpio)) {
        setError('El código debe tener el formato XXXX-XXXX (8 caracteres)');
        setLoading(false);
        setEstadoCandado('error');
        setTimeout(() => setEstadoCandado('locked'), 2000);
        return;
      }

      // Iniciar animación de desbloqueo
      setEstadoCandado('unlocking');
      
      const response = await api.post(`/public/reportes/${token}/validar`, {
        codigo_acceso: codigoLimpio
      });

      if (response.data.valido) {
        setEstadoCandado('unlocked');
        
        const ahora = new Date();
        const fechaExpiracion = new Date(ahora.getTime() + 60 * 60 * 1000);
        const fechaExpiracionStr = fechaExpiracion.toISOString();
        
        sessionStorage.setItem('codigo_acceso', codigoLimpio);
        sessionStorage.setItem('reporte_id', response.data.reporte_id);
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('fecha_apertura', ahora.toISOString());
        sessionStorage.setItem('fecha_expiracion', fechaExpiracionStr);
        
        // Esperar a que termine la animación antes de navegar
        setTimeout(() => {
          navigate(`/reporte/${token}`);
        }, 1200);
      }
    } catch (error) {
      let errorMessage = 'Código de acceso inválido. Por favor verifica e intenta nuevamente.';
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail
            .map(err => err.msg || err.message || JSON.stringify(err))
            .join(', ');
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data.detail === 'object') {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setEstadoCandado('error');
      setTimeout(() => setEstadoCandado('locked'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCodigoChange = (e) => {
    let value = e.target.value.toUpperCase();
    value = value.replace(/\s/g, '');
    value = value.replace(/[^A-Z0-9-]/g, '');
    if (value.length > 4 && !value.includes('-')) {
      value = value.substring(0, 4) + '-' + value.substring(4);
    }
    if (value.length > 9) {
      value = value.substring(0, 9);
    }
    setCodigo(value);
    // Resetear estado del candado al escribir
    if (estadoCandado === 'error') {
      setEstadoCandado('locked');
    }
  };

  const renderCandado = () => {
    switch (estadoCandado) {
      case 'unlocking':
        return (
          <div className="candado-container unlocking">
            <div className="candado-icon">
              <Lock size={56} className="lock-icon" />
              <div className="lock-spinner">
                <Loader2 size={40} className="spinning" />
              </div>
            </div>
            <span className="candado-text">Verificando...</span>
          </div>
        );
      case 'unlocked':
        return (
          <div className="candado-container unlocked">
            <div className="candado-icon">
              <Unlock size={56} className="unlock-icon" />
              <div className="lock-success">
                <CheckCircle size={24} className="success-check" />
              </div>
            </div>
            <span className="candado-text">¡Acceso concedido!</span>
          </div>
        );
      case 'error':
        return (
          <div className="candado-container error">
            <div className="candado-icon">
              <Lock size={56} className="lock-error-icon" />
              <div className="lock-error">
                <XCircle size={24} className="error-cross" />
              </div>
            </div>
            <span className="candado-text">Acceso denegado</span>
          </div>
        );
      default:
        return (
          <div className="candado-container locked">
            <div className="candado-icon">
              <Lock size={56} className="lock-icon" />
            </div>
            <span className="candado-text">Ingresa tu código</span>
          </div>
        );
    }
  };

  return (
    <div className="acceso-container">
      <div className="acceso-card">
        {/* Candado animado */}
        <div className="acceso-icon-wrapper">
          {renderCandado()}
        </div>

        <h1>Acceso al Reporte</h1>
        <p className="acceso-subtitle">
          Ingresa el código de acceso que te proporcionó el administrador
        </p>

        <form onSubmit={handleSubmit} className="acceso-form">
          <div className="input-group">

            <div className="input-wrapper">
              <KeyRound size={18} className="input-icon" />
              <input
                id="codigo"
                type="text"
                value={codigo}
                onChange={handleCodigoChange}
                placeholder="Ej: XK7P-9M2L"
                className={`codigo-input ${estadoCandado === 'error' ? 'error' : ''} ${estadoCandado === 'unlocked' ? 'success' : ''}`}
                maxLength={9}
                autoFocus
                required
                disabled={loading || estadoCandado === 'unlocking'}
              />
              {codigo && codigo.length === 9 && estadoCandado !== 'error' && (
                <CheckCircle size={18} className="input-valid-icon" />
              )}
            </div>
            <p className="input-hint">
              <ShieldCheck size={12} />
              Formato: XXXX-XXXX (8 caracteres alfanuméricos)
            </p>
          </div>

          {error && (
            <div className="error-message">
              <ShieldAlert size={18} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || estadoCandado === 'unlocking' || estadoCandado === 'unlocked'}
            className="btn-acceder"
          >
            {loading || estadoCandado === 'unlocking' ? (
              <>
                <Loader2 size={18} className="spinning" />
                Verificando...
              </>
            ) : estadoCandado === 'unlocked' ? (
              <>
                <Unlock size={18} />
                Accediendo...
              </>
            ) : (
              <>
                <Lock size={18} />
                Acceder al Reporte
              </>
            )}
          </button>
        </form>

        <div className="acceso-footer">
          <MailQuestion size={14} />
          <p>¿No tienes código? Contacta con tu administrador.</p>
        </div>
      </div>
    </div>
  );
};

export default AccesoReporte;