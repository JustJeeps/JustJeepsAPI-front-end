import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from './LoginModal';
import { Spin } from 'antd';

/**
 * ProtectedRoute: component that protects routes requiring authentication
 *
 * @param {ReactNode} children - Child components rendered when authenticated
 * @param {ReactNode} fallback - Alternative component (optional)
 * @param {boolean} requireAuth - If true, forces authentication even when authEnabled=false (default: true)
 * @param {boolean} redirectToLogin - If true, redirects to /login instead of showing the modal (default: true)
 * @param {string[]} allowedUsers - Optional list of allowed usernames
 */
const ProtectedRoute = ({
  children,
  fallback = null,
  requireAuth = true,
  redirectToLogin = true,
  allowedUsers = null,
}) => {
  const { authEnabled, isAuthenticated, loading, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Decides whether authentication has to be required
  // If authEnabled=false on the backend, authentication is not required
  // If authEnabled=true on the backend, use the requireAuth value (default: true)
  const shouldRequireAuth = authEnabled && requireAuth;
  const normalizedUsername = (user?.username || user?.name || '').toLowerCase();
  const isAllowedUser = !Array.isArray(allowedUsers) || allowedUsers.length === 0
    ? true
    : allowedUsers.map((value) => String(value).toLowerCase()).includes(normalizedUsername);

  useEffect(() => {
    // If the user is not authenticated and we should redirect, go to login
    if (!loading && shouldRequireAuth && !isAuthenticated && redirectToLogin) {
      // Save the current URL so we can redirect back to it after login
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
        <Spin size="large" tip="Checking your access..." />
      </div>
    );
  }

  // If authentication is not required, render normally
  if (!shouldRequireAuth) {
    return children;
  }

  // If authenticated, render children
  if (isAuthenticated) {
    if (!isAllowedUser) {
      return fallback || (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h3>Restricted</h3>
          <p>You do not have permission to open this page.</p>
        </div>
      );
    }
    return children;
  }

  // If we are about to redirect, render nothing (avoids a flash of content)
  if (redirectToLogin) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px'
      }}>
        <Spin size="large" tip="Taking you to the sign in page..." />
      </div>
    );
  }

  // Fallback: show a login option through the modal
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
          <h3>Sign in required</h3>
          <p>Please sign in to see this content.</p>
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
            Sign in
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