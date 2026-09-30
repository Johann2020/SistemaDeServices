const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { findAccountByGoogleId, findAccountByEmail, createAccount } = require('./masterDb.cjs');

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'crm-dev-secret-local-only';
})();

function generateToken(account) {
  return jwt.sign(
    { id: account.id, email: account.email, tenantId: account.tenantId, role: account.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Middleware: extracts tenant from JWT cookie or Authorization header
function authMiddleware(req, res, next) {
  const token = req.cookies?.crm_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    res.clearCookie('crm_token');
    return res.status(401).json({ error: 'Sesión expirada' });
  }
}

// Exchange Google OAuth code for user info using Google's token and userinfo endpoints
async function exchangeGoogleCode(code, redirectUri) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  return userRes.json();
}

// Find or create account from Google profile
function findOrCreateFromGoogle(profile) {
  let account = findAccountByGoogleId(profile.id);
  if (account) return account;

  // Check if email already exists (maybe registered differently)
  account = findAccountByEmail(profile.email);
  if (account) return account;

  // Create new account + tenant
  const tenantId = `tenant-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  return createAccount({
    id: `acc-${crypto.randomUUID()}`,
    googleId: profile.id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture || '',
    tenantId,
    role: 'admin',
    createdAt: new Date().toISOString(),
  });
}

module.exports = { generateToken, verifyToken, authMiddleware, exchangeGoogleCode, findOrCreateFromGoogle };
