import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginModal from './LoginModal';

const ProtectedRoute = ({ children, fallback = null }) => {
  const { authEnabled, isAuthenticated, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // If authentication is disabled, render children normally
  if (!authEnabled) {
    return children;
  }

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // If authenticated, render children
  if (isAuthenticated) {
    return children;
  }

  // If not authenticated and authentication is enabled, show login prompt
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
          <h3>Authentication Required</h3>
          <p>Please sign in to access this content.</p>
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
            Sign In
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