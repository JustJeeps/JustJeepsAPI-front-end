import React from 'react';
import { Card, Typography, Button, Space, Divider } from 'antd';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';

const { Title, Text, Paragraph } = Typography;

const AuthTestPage = () => {
  const { authEnabled, isAuthenticated, user, logout } = useAuth();

  if (!authEnabled) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <Card>
          <Title level={2}>🔓 Authentication Status</Title>
          <Paragraph>
            <strong>Status:</strong> Authentication is currently disabled
          </Paragraph>
          <Paragraph>
            To enable authentication, set <code>ENABLE_AUTH=true</code> in your backend .env file and restart the server.
          </Paragraph>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px' }}>
        <Title level={2} style={{ textAlign: 'center' }}>
          🔐 Authentication Required
        </Title>
        <LoginForm onLoginSuccess={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <Title level={2}>✅ Authentication Status</Title>
        
        <Divider />
        
        <Title level={4}>User Information</Title>
        <Paragraph>
          <strong>Name:</strong> {user.firstname} {user.lastname}<br />
          <strong>Username:</strong> {user.username}<br />
          <strong>Email:</strong> {user.email}<br />
          <strong>User ID:</strong> {user.id}
        </Paragraph>
        
        <Divider />
        
        <Title level={4}>System Status</Title>
        <Paragraph>
          <strong>Authentication Enabled:</strong> ✅ Yes<br />
          <strong>Logged In:</strong> ✅ Yes<br />
          <strong>Token:</strong> Valid
        </Paragraph>
        
        <Divider />
        
        <Space>
          <Button type="primary" danger onClick={logout}>
            Sign Out
          </Button>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default AuthTestPage;