import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get the origin page (where the user came from)
  const from = location.state?.from || '/';

  // If it is still loading, show the loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <p>Loading...</p>
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
          // Redirect to the origin page or to home
          navigate(from, { replace: true });
        }}
      />
    </div>
  );
};

export default LoginPage;