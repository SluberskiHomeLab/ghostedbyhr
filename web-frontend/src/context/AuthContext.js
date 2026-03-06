import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('web_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem('web_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('web_token'));
  const [loading, setLoading] = useState(true);

  // Modal state: null | 'login' | 'register'
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('web_token');
      if (storedToken) {
        try {
          const response = await api.get('/auth/me');
          const userData = response.data;
          setUser(userData);
          localStorage.setItem('web_user', JSON.stringify(userData));
        } catch {
          localStorage.removeItem('web_token');
          localStorage.removeItem('web_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('web_token', newToken);
    localStorage.setItem('web_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return response.data;
  };

  const register = async (email, password, firstName, lastName) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('web_token', newToken);
    localStorage.setItem('web_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('web_token');
    localStorage.removeItem('web_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('web_user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, []);

  const showModal = (mode = 'login') => setModal(mode);
  const hideModal = () => setModal(null);

  return (
    <AuthContext.Provider value={{ user, token, loading, modal, login, register, logout, refreshUser, showModal, hideModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
