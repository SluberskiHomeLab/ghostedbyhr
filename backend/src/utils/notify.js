const { emitToUser } = require('../config/socketio');
const { sendMail } = require('../config/mailer');
const pool = require('../config/database');

const TYPE_LABELS = {
  like: 'liked your post',
  comment: 'commented on your post',
  mention: 'mentioned you',
  connection_request: 'sent you a connection request',
  connection_accepted: 'accepted your connection request',
};

const SETTINGS_KEY = {
  like: 'notify_likes',
  comment: 'notify_comments',
  mention: 'notify_mentions',
  connection_request: 'notify_connections',
  connection_accepted: 'notify_connections',
};

/**
 * Create a notification, emit it via socket, and optionally send email.
 *
 * @param {object} opts
 * @param {number} opts.recipientId  - user who receives the notification
 * @param {number} opts.actorId      - user who triggered the event
 * @param {string} opts.type         - like | comment | mention | connection_request | connection_accepted
 * @param {number} [opts.postId]
 * @param {number} [opts.commentId]
 */
async function createNotification({ recipientId, actorId, type, postId = null, commentId = null }) {
  if (!recipientId || !actorId || recipientId === actorId) return;

  try {
    // Fetch or create settings for the recipient
    const settingsRes = await pool.query(
      `INSERT INTO user_notification_settings (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
       RETURNING *`,
      [recipientId]
    );
    const settings = settingsRes.rows[0];

    const settingsKey = SETTINGS_KEY[type];
    if (settingsKey && settings[settingsKey] === false) return;

    // Insert notification
    const result = await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [recipientId, actorId, type, postId, commentId]
    );
    const notification = result.rows[0];

    // Fetch actor details to enrich the payload
    const actorRes = await pool.query(
      'SELECT first_name, last_name, avatar_url FROM users WHERE id = $1',
      [actorId]
    );
    const actor = actorRes.rows[0];
    const enriched = {
      ...notification,
      actor_name: actor ? `${actor.first_name} ${actor.last_name}` : null,
      actor_avatar: actor ? actor.avatar_url : null,
      actor_id: actorId,
    };

    // Emit real-time
    if (settings.web_notifications !== false) {
      emitToUser(recipientId, 'notification', enriched);
    }

    // Email notification
    if (settings.email_notifications) {
      const recipientRes = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [recipientId]);
      const recipient = recipientRes.rows[0];
      if (recipient) {
        const actionText = TYPE_LABELS[type] || type;
        const actorName = actor ? `${actor.first_name} ${actor.last_name}` : 'Someone';
        sendMail({
          to: recipient.email,
          subject: `${actorName} ${actionText}`,
          html: `<p>Hi ${recipient.first_name},</p><p><strong>${actorName}</strong> ${actionText}.</p><p><a href="${process.env.APP_URL || ''}">View on Ghosted By HR</a></p>`,
          text: `Hi ${recipient.first_name},\n\n${actorName} ${actionText}.\n\nVisit Ghosted By HR to see it.`,
        }).catch((err) => console.error('Notification email error:', err.message));
      }
    }
  } catch (err) {
    // Notifications are non-critical — log and continue
    console.error('createNotification error:', err.message);
  }
}

/**
 * Extract @username mention targets from text.
 * Matches @word tokens and looks them up in users.username.
 * Returns an array of user IDs that were mentioned (excluding the actor).
 */
async function extractMentions(text, actorId) {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_.]+)/g);
  if (!matches) return [];

  const mentionedIds = new Set();
  for (const match of matches) {
    const uname = match.slice(1);
    const res = await pool.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2 LIMIT 1`,
      [uname, actorId]
    );
    res.rows.forEach((r) => mentionedIds.add(r.id));
  }
  return [...mentionedIds];
}

module.exports = { createNotification, extractMentions };
