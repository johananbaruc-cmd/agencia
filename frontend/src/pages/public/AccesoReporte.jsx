import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import './AccesoReporte.css';

const AccesoReporte = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        return;
      }

      const response = await api.post(`/public/reportes/${token}/validar`, {
        codigo_acceso: codigoLimpio
      });

      if (response.data.valido) {
        const ahora = new Date();
        const fechaExpiracion = new Date(ahora.getTime() + 60 * 60 * 1000); // 1 hora
        const fechaExpiracionStr = fechaExpiracion.toISOString();
        
        sessionStorage.setItem('codigo_acceso', codigoLimpio);
        sessionStorage.setItem('reporte_id', response.data.reporte_id);
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('fecha_apertura', ahora.toISOString());
        sessionStorage.setItem('fecha_expiracion', fechaExpiracionStr);
        
        navigate(`/reporte/${token}`);
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
  };

  return (
    <div className="acceso-container">
      <div className="acceso-card">
        <div className="acceso-icon">🔐</div>
        <h1>Acceso al Reporte</h1>
        <p className="acceso-subtitle">
          Ingresa el código de acceso que te proporcionó el administrador
        </p>

        <form onSubmit={handleSubmit} className="acceso-form">
          <div>
            <label htmlFor="codigo">Código de Acceso</label>
            <input
              id="codigo"
              type="text"
              value={codigo}
              onChange={handleCodigoChange}
              placeholder="Ej: XK7P-9M2L"
              className="codigo-input"
              maxLength={9}
              autoFocus
              required
            />
            <p className="input-hint">Formato: XXXX-XXXX (8 caracteres)</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-acceder"
          >
            {loading ? 'Verificando...' : 'Acceder al Reporte'}
          </button>
        </form>

        <div className="acceso-footer">
          <p>¿No tienes código? Contacta con tu administrador.</p>
        </div>
      </div>
    </div>
  );
};

export default AccesoReporte;