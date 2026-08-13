import React, { useState } from 'react';
import { authService } from '../services/auth';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginForm: React.FC<Props> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(username, password);
        onLoginSuccess();
      } else {
        await authService.register(username, password);
        await authService.login(username, password);
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>{isLogin ? 'Login to Traycer' : 'Create Account'}</h2>
        
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Username</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
        </button>

        <button 
          type="button" 
          onClick={() => setIsLogin(!isLogin)} 
          style={styles.toggleButton}
        >
          {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc'
  },
  form: {
    background: '#1e293b',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    marginTop: 0,
    marginBottom: '1.5rem',
    textAlign: 'center' as const,
  },
  field: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #475569',
    backgroundColor: '#0f172a',
    color: 'white',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    marginTop: '1rem',
  },
  toggleButton: {
    width: '100%',
    padding: '0.5rem',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    marginTop: '1rem',
    fontSize: '0.875rem',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  }
};
