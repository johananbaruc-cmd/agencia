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
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('Llamando a API:', `${import.meta.env.VITE_API_URL}/auth/login`);
      
      const response = await api.post('/auth/login', { email, password });
      console.log('Respuesta API:', response.data);
      
      const { access_token, user_id, user_name, user_role, agency_id } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify({
        id: user_id,
        name: user_name,
        role: user_role,
        agency_id
      }));
      
      setToken(access_token);
      setUser({ id: user_id, name: user_name, role: user_role, agency_id });
      
      return { success: true };
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
    localStorage.removeItem('user');
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
