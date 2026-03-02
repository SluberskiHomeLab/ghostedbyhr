const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  console.log(`SMTP configured: ${SMTP_HOST}:${SMTP_PORT || 587}`);
} else {
  console.warn(
    'SMTP not configured — email sending is disabled. ' +
      'Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env to enable.'
  );
}

/**
 * Send an email. Silently skips if SMTP is not configured.
 * @param {{ to: string, subject: string, html?: string, text?: string }} opts
 */
async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    console.warn(`[Email disabled] Would send to <${to}>: ${subject}`);
    return { skipped: true };
  }
  return transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    html,
    text,
  });
}

/**
 * Returns true if SMTP transport is configured and ready.
 */
function isConfigured() {
  return !!transporter;
}

module.exports = { sendMail, isConfigured };
