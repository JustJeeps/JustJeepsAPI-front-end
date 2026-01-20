import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  const { authEnabled, isAuthenticated } = useAuth();

  // If auth is disabled, redirect to home
  if (!authEnabled) {
    return <Navigate to="/" replace />;
  }

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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
          // Redirect will happen automatically via Navigate above
          window.location.href = '/dashboard';
        }}
      />
    </div>
  );
};

export default LoginPage;