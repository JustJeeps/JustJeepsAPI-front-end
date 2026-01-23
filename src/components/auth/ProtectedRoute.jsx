import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from './LoginModal';
import { Spin } from 'antd';

/**
 * ProtectedRoute - Componente para proteger rotas que requerem autenticação
 *
 * @param {ReactNode} children - Componentes filhos a serem renderizados se autenticado
 * @param {ReactNode} fallback - Componente alternativo (opcional)
 * @param {boolean} requireAuth - Se true, força autenticação mesmo quando authEnabled=false (default: true)
 * @param {boolean} redirectToLogin - Se true, redireciona para /login em vez de mostrar modal (default: true)
 */
const ProtectedRoute = ({
  children,
  fallback = null,
  requireAuth = true,
  redirectToLogin = true
}) => {
  const { authEnabled, isAuthenticated, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determina se deve exigir autenticação
  // Por padrão, SEMPRE exige autenticação (mais seguro)
  const shouldRequireAuth = requireAuth || authEnabled;

  useEffect(() => {
    // Se não está autenticado e deve redirecionar, vai para login
    if (!loading && shouldRequireAuth && !isAuthenticated && redirectToLogin) {
      // Salva a URL atual para redirecionar após o login
      navigate('/login', {
        state: { from: location.pathname },
        replace: true
      });
    }
  }, [loading, shouldRequireAuth, isAuthenticated, redirectToLogin, navigate, location]);

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px'
      }}>
        <Spin size="large" tip="Verificando autenticação..." />
      </div>
    );
  }

  // Se não requer autenticação, renderiza normalmente
  if (!shouldRequireAuth) {
    return children;
  }

  // If authenticated, render children
  if (isAuthenticated) {
    return children;
  }

  // Se vai redirecionar, não mostra nada (evita flash de conteúdo)
  if (redirectToLogin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px'
      }}>
        <Spin size="large" tip="Redirecionando para login..." />
      </div>
    );
  }

  // Fallback: mostra opção de login via modal
  return (
    <div>
      {fallback || (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h3>Autenticação Necessária</h3>
          <p>Por favor, faça login para acessar este conteúdo.</p>
          <button
            onClick={() => setShowLoginModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Entrar
          </button>
        </div>
      )}

      <LoginModal
        visible={showLoginModal}
        onCancel={() => setShowLoginModal(false)}
        onLoginSuccess={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default ProtectedRoute;