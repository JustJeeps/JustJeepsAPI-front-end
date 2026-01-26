import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);

  // Ref para evitar múltiplos logouts simultâneos
  const isLoggingOut = useRef(false);

  // API base URL - adjust if needed
  // Prefer Vite env var (set to the ngrok domain) otherwise fall back to relative paths
  // When VITE_API_URL is empty, using '' will make axios requests use relative URLs
  // which allows the Vite dev server proxy (configured in vite.config.js) to forward
  // /api requests to the backend on localhost:8080.
  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  // Função de logout que pode ser chamada pelo interceptor
  const handleUnauthorized = useCallback(() => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];

    // Redireciona para login se não estiver já lá
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }

    isLoggingOut.current = false;
  }, []);

  // Configura interceptor de resposta para tratar erros 401
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Se receber 401 (Unauthorized) ou 403 (Forbidden), faz logout
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.warn('Sessão expirada ou não autorizada. Redirecionando para login...');
          handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup: remove o interceptor quando o componente desmonta
    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, [handleUnauthorized]);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Set up axios interceptor for token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('authToken', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('authToken');
    }
  }, [token]);

  const checkAuthStatus = async () => {
    try {
      // Check if authentication is enabled on the server
      const response = await axios.get(`${API_BASE_URL}/api/auth/status`);
      setAuthEnabled(response.data.authEnabled);

      // If auth is enabled and we have a token, verify it
      if (response.data.authEnabled && token) {
        await getCurrentUser();
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setAuthEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
      setUser(response.data.user);
    } catch (error) {
      console.error('Get current user failed:', error);
      logout(); // Clear invalid token
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password,
      });

      const { token: newToken, user: userData } = response.data;

      // Set axios header IMMEDIATELY before state updates
      // This prevents race condition where navigation happens before useEffect runs
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      localStorage.setItem('authToken', newToken);

      setToken(newToken);
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`);
    } catch (error) {
      console.error('Logout request failed:', error);
    }

    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);

      return { success: true, user: newUser };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, message };
    }
  };

  const value = {
    user,
    token,
    authEnabled,
    loading,
    login,
    logout,
    register,
    getCurrentUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};