import { api } from '../api/client';

let accessToken: string | null = null;
let currentUser: any = null;

export const authService = {
  getAccessToken: () => accessToken,
  getCurrentUser: () => currentUser,

  login: async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    accessToken = data.accessToken;
    currentUser = data.user;
    return data;
  },

  register: async (username: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Registration failed');
    }

    return response.json();
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      accessToken = null;
      currentUser = null;
      window.location.reload();
    }
  },

  refreshToken: async () => {
    const response = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!response.ok) {
      accessToken = null;
      currentUser = null;
      throw new Error('Refresh failed');
    }
    const data = await response.json();
    accessToken = data.accessToken;
    return data.accessToken;
  }
};
