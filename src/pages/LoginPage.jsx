import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Obtém a página de origem (de onde o usuário veio)
  const from = location.state?.from || '/';

  // Se ainda está carregando, mostra loading
  if (loading) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <p>Carregando...</p>
      </div>
    );
  }

  // If already logged in, redirect to original destination or home
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <LoginForm
        onLoginSuccess={() => {
          // Redireciona para a página de origem ou para home
          navigate(from, { replace: true });
        }}
      />
    </div>
  );
};

export default LoginPage;