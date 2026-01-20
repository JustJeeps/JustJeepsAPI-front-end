import React, { useState } from 'react';
import { Modal } from 'antd';
import LoginForm from './LoginForm';
import { useAuth } from '../../context/AuthContext';

const LoginModal = ({ visible, onCancel, onLoginSuccess }) => {
  const { authEnabled } = useAuth();

  const handleLoginSuccess = (user) => {
    onLoginSuccess?.(user);
    onCancel(); // Close modal on successful login
  };

  if (!authEnabled) {
    return null; // Don't render if authentication is disabled
  }

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={450}
      centered
      destroyOnClose
    >
      <LoginForm 
        onLoginSuccess={handleLoginSuccess}
        onCancel={onCancel}
      />
    </Modal>
  );
};

export default LoginModal;