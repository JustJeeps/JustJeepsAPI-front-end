import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const LoginForm = ({ onLoginSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');

    try {
      const result = await login(values.username, values.password);
      
      if (result.success) {
        onLoginSuccess?.(result.user);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        width: 400,
        margin: '50px auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3}>Sign In</Title>
        <Text type="secondary">Access your JustJeeps account</Text>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError('')}
        />
      )}

      <Form
        name="login"
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item
          name="username"
          rules={[
            { required: true, message: 'Please input your username or email!' },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Username or Email"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Password"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{ marginBottom: 8 }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          
          {onCancel && (
            <Button
              block
              size="large"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Test Credentials: admin / adminpassword
        </Text>
      </div>
    </Card>
  );
};

export default LoginForm;