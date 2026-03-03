import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import './NotificationPanel.css';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function notifMessage(notif) {
  const name = notif.actor_name || 'Someone';
  switch (notif.type) {
    case 'like': return <><strong>{name}</strong> liked your post</>;
    case 'comment': return <><strong>{name}</strong> commented on your post</>;
    case 'mention': return <><strong>{name}</strong> mentioned you in a post</>;
    case 'connection_request': return <><strong>{name}</strong> sent you a connection request</>;
    case 'connection_accepted': return <><strong>{name}</strong> accepted your connection request</>;
    default: return <><strong>{name}</strong> sent you a notification</>;
  }
}

export default function NotificationPanel({ onClose }) {
  const { notifications, markRead, markAllRead, fetchNotifications } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  function handleClick(notif) {
    if (!notif.read) markRead(notif.id);
    onClose();
    if (notif.post_id) navigate('/');
    else if (notif.type === 'connection_request' || notif.type === 'connection_accepted') navigate('/connections');
    else if (notif.actor_id) navigate(`/profile/${notif.actor_id}`);
  }

  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <span className="notif-panel-title">Notifications</span>
        {notifications.some(n => !n.read) && (
          <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      <div className="notif-panel-body">
        {notifications.length === 0 ? (
          <div className="notif-empty">No notifications yet</div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`notif-item${notif.read ? '' : ' notif-item--unread'}`}
              onClick={() => handleClick(notif)}
            >
              <div className="notif-avatar-wrap">
                {notif.actor_avatar ? (
                  <img src={notif.actor_avatar} alt="" className="notif-avatar" />
                ) : (
                  <div className="notif-avatar-placeholder">
                    {(notif.actor_name || '?')[0].toUpperCase()}
                  </div>
                )}
                {!notif.read && <span className="notif-dot" />}
              </div>
              <div className="notif-content">
                <p className="notif-text">{notifMessage(notif)}</p>
                <span className="notif-time">{timeAgo(notif.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
