import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './ConnectionsPage.css';

function ConnectionsPage() {
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const [connRes, pendingRes] = await Promise.all([
        api.get('/connections'),
        api.get('/connections/pending').catch(() => ({ data: [] })),
      ]);
      setConnections(connRes.data.connections || connRes.data || []);
      setPending(pendingRes.data.requests || pendingRes.data || []);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAccept = async (requestId) => {
    try {
      await api.post(`/connections/${requestId}/accept`);
      fetchConnections();
    } catch (err) {
      console.error('Failed to accept connection:', err);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await api.post(`/connections/${requestId}/reject`);
      fetchConnections();
    } catch (err) {
      console.error('Failed to reject connection:', err);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  };

  return (
    <div className="connections-page">
      <Navbar />
      <div className="connections-container">
        {loading ? (
          <div className="connections-loading">Loading connections...</div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="connections-section">
                <h2>Pending Requests ({pending.length})</h2>
                <div className="connections-grid">
                  {pending.map((request) => {
                    const sender = request.sender || request.from || request;
                    return (
                      <div key={request._id || request.id} className="connection-card">
                        <div className="connection-avatar">
                          {getInitials(sender.firstName, sender.lastName)}
                        </div>
                        <Link
                          to={`/profile/${sender._id || sender.id}`}
                          className="connection-name"
                        >
                          {sender.firstName} {sender.lastName}
                        </Link>
                        {sender.headline && (
                          <p className="connection-headline">{sender.headline}</p>
                        )}
                        <div className="connection-actions">
                          <button
                            className="accept-btn"
                            onClick={() => handleAccept(request._id || request.id)}
                          >
                            Accept
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleReject(request._id || request.id)}
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="connections-section">
              <h2>My Connections ({connections.length})</h2>
              {connections.length === 0 ? (
                <div className="connections-empty">
                  <p>No connections yet. Start connecting with others!</p>
                </div>
              ) : (
                <div className="connections-grid">
                  {connections.map((connection) => {
                    const person = connection.user || connection;
                    return (
                      <div key={person._id || person.id} className="connection-card">
                        <div className="connection-avatar">
                          {getInitials(person.firstName, person.lastName)}
                        </div>
                        <Link
                          to={`/profile/${person._id || person.id}`}
                          className="connection-name"
                        >
                          {person.firstName} {person.lastName}
                        </Link>
                        {person.headline && (
                          <p className="connection-headline">{person.headline}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ConnectionsPage;
