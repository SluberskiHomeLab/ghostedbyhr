import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import './ToastContainer.css';

function toastMessage(notif) {
  const name = notif.actor_name || 'Someone';
  switch (notif.type) {
    case 'like': return `${name} liked your post`;
    case 'comment': return `${name} commented on your post`;
    case 'mention': return `${name} mentioned you in a post`;
    case 'connection_request': return `${name} sent you a connection request`;
    case 'connection_accepted': return `${name} accepted your connection request`;
    default: return `New notification from ${name}`;
  }
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.toastId}
          className="toast"
          onClick={() => {
            dismissToast(toast.toastId);
            if (toast.post_id) navigate('/');
          }}
        >
          <div className="toast-body">
            {toast.actor_avatar ? (
              <img src={toast.actor_avatar} alt="" className="toast-avatar" />
            ) : (
              <div className="toast-avatar-placeholder">
                {(toast.actor_name || '?')[0].toUpperCase()}
              </div>
            )}
            <span className="toast-message">{toastMessage(toast)}</span>
          </div>
          <button
            className="toast-close"
            onClick={e => { e.stopPropagation(); dismissToast(toast.toastId); }}
          >×</button>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );
}
