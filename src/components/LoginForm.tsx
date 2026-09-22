import React, { useState } from 'react';
import { authService } from '../services/auth';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginForm: React.FC<Props> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(username, password);
        onLoginSuccess();
      } else {
        await authService.register(username, password, email, phone, occupation);
        setSuccessMessage('Account created — please log in with your username and password.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setError('Google OAuth credentials not configured in this local environment.');
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>{isLogin ? 'Login to Traycer' : 'Create Account'}</h2>
        
        {successMessage && <div style={styles.success}>{successMessage}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Username *</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            placeholder="e.g. alex_dev"
            required
          />
        </div>

        {!isLogin && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="alex@workspace.dev"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.input}
                placeholder="+1 (555) 019-2834"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Occupation / Role</label>
              <input 
                type="text" 
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                style={styles.input}
                placeholder="Senior Fullstack Engineer"
              />
            </div>
          </>
        )}

        <div style={styles.field}>
          <label style={styles.label}>Password *</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
        </button>

        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <div style={styles.dividerLine} />
        </div>

        <button
          type="button"
          disabled
          title="Google OAuth login is not configured in this local environment"
          style={{ ...styles.googleButton, opacity: 0.6, cursor: 'not-allowed' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: '8px' }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.72L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
            <path fill="#FBBC05" d="M3.87 10.8c-.18-.53-.28-1.09-.28-1.8s.1-1.27.28-1.8L.97 4.96C.35 6.18 0 7.55 0 9s.35 2.82.97 4.04l2.9-2.24z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.24C4.59 5.05 6.62 3.58 9 3.58z"/>
          </svg>
          {isLogin ? 'Sign in with Google (Not Configured)' : 'Sign up with Google (Not Configured)'}
        </button>

        <button 
          type="button" 
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
            setSuccessMessage('');
          }} 
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
    minHeight: '100vh',
    backgroundColor: '#050508',
    color: '#f8fafc',
    padding: '1rem',
  },
  form: {
    background: '#0d1117',
    padding: '2.5rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    width: '100%',
    maxWidth: '420px',
  },
  title: {
    marginTop: 0,
    marginBottom: '1.5rem',
    textAlign: 'center' as const,
    fontSize: '1.5rem',
    fontWeight: 600,
  },
  field: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.8rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: '#161b22',
    color: 'white',
    fontSize: '0.875rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
  dividerContainer: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.25rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    padding: '0 0.75rem',
    color: '#64748b',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  googleButton: {
    width: '100%',
    padding: '0.65rem',
    backgroundColor: '#161b22',
    color: '#f8fafc',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButton: {
    width: '100%',
    padding: '0.5rem',
    background: 'none',
    border: 'none',
    color: '#38bdf8',
    cursor: 'pointer',
    marginTop: '1rem',
    fontSize: '0.85rem',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '0.65rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.8rem',
  },
  success: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#4ade80',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    padding: '0.65rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.8rem',
  },
};

