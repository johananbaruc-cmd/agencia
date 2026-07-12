import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
        // Configurar el token en axios si existe
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('Llamando a API:', `${import.meta.env.VITE_API_URL}/auth/login`);
      const response = await api.post('/auth/login', { email, password });
      console.log('Respuesta API:', response.data);

      const { 
        access_token, 
        user_id, 
        user_name, 
        user_role, 
        agency_id, 
        must_change_password 
      } = response.data;

      // Guardar token con AMBAS keys para compatibilidad
      localStorage.setItem('token', access_token);
      localStorage.setItem('access_token', access_token);
      
      // Guardar el rol también por separado para fácil acceso
      localStorage.setItem('userRole', user_role);

      const userData = {
        id: user_id,
        name: user_name,
        role: user_role,
        agency_id
      };

      localStorage.setItem('user', JSON.stringify(userData));

      // Configurar axios
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      setToken(access_token);
      setUser(userData);

      // Retornar todo lo necesario incluyendo el usuario completo
      return { 
        success: true, 
        must_change_password: must_change_password || false,
        user: userData // <-- Agregar el usuario para usarlo en Login
      };

    } catch (error) {
      console.error('Error en login:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || 'Error al iniciar sesión'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}