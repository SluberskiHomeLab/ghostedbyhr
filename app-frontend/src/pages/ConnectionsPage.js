import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ConnectionsPage.css';

function ConnectionsPage() {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await api.get('/connections');
      const all = Array.isArray(res.data) ? res.data : [];
      const userId = user?.id;

      // Separate into accepted connections and pending requests (where current user is receiver)
      const acceptedList = [];
      const pendingList = [];

      all.forEach((conn) => {
        if (conn.status === 'accepted') {
          acceptedList.push(conn);
        } else if (conn.status === 'pending' && conn.receiver_id === userId) {
          pendingList.push(conn);
        }
      });

      setAccepted(acceptedList);
      setPending(pendingList);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAccept = async (connectionId) => {
    try {
      await api.put(`/connections/${connectionId}`, { status: 'accepted' });
      fetchConnections();
    } catch (err) {
      console.error('Failed to accept connection:', err);
    }
  };

  const handleReject = async (connectionId) => {
    try {
      await api.put(`/connections/${connectionId}`, { status: 'rejected' });
      fetchConnections();
    } catch (err) {
      console.error('Failed to reject connection:', err);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  };

  // For a connection row, get the "other" person's info
  const getOtherPerson = (conn) => {
    const userId = user?.id;
    if (conn.requester_id === userId) {
      return {
        id: conn.receiver_user_id,
        first_name: conn.receiver_first_name,
        last_name: conn.receiver_last_name,
        headline: conn.receiver_headline,
        avatar_url: conn.receiver_avatar_url,
      };
    }
    return {
      id: conn.requester_user_id,
      first_name: conn.requester_first_name,
      last_name: conn.requester_last_name,
      headline: conn.requester_headline,
      avatar_url: conn.requester_avatar_url,
    };
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
                  {pending.map((conn) => {
                    const person = getOtherPerson(conn);
                    return (
                      <div key={conn.id} className="connection-card">
                        <div className="connection-avatar">
                          {person.avatar_url
                            ? <img src={person.avatar_url} alt={`${person.first_name} ${person.last_name}`} className="connection-avatar-img" />
                            : getInitials(person.first_name, person.last_name)
                          }
                        </div>
                        <Link
                          to={`/profile/${person.id}`}
                          className="connection-name"
                        >
                          {person.first_name} {person.last_name}
                        </Link>
                        {person.headline && (
                          <p className="connection-headline">{person.headline}</p>
                        )}
                        <div className="connection-actions">
                          <button
                            className="accept-btn"
                            onClick={() => handleAccept(conn.id)}
                          >
                            Accept
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleReject(conn.id)}
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
              <h2>My Connections ({accepted.length})</h2>
              {accepted.length === 0 ? (
                <div className="connections-empty">
                  <p>No connections yet. Start connecting with others!</p>
                </div>
              ) : (
                <div className="connections-grid">
                  {accepted.map((conn) => {
                    const person = getOtherPerson(conn);
                    return (
                      <div key={conn.id} className="connection-card">
                        <div className="connection-avatar">
                          {person.avatar_url
                            ? <img src={person.avatar_url} alt={`${person.first_name} ${person.last_name}`} className="connection-avatar-img" />
                            : getInitials(person.first_name, person.last_name)
                          }
                        </div>
                        <Link
                          to={`/profile/${person.id}`}
                          className="connection-name"
                        >
                          {person.first_name} {person.last_name}
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
