import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../services/api';

const NotificationContext = createContext(null);

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  const addToast = useCallback((notification) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-2), { ...notification, toastId: id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch {
      // silent
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.read).length);
    } catch {
      // silent
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!user || !token) return;

    fetchNotifications();

    // Set up socket.io connection
    const backendUrl = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace('/api', '')
      : window.location.origin;

    const socket = io(backendUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      addToast(notif);
    });

    // Fallback polling every 60s for unread count
    const pollInterval = setInterval(fetchUnreadCount, 60000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [user, token, fetchNotifications, fetchUnreadCount, addToast]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, toasts, fetchNotifications, markRead, markAllRead, dismissToast }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
