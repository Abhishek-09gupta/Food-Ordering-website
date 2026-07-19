const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function identify(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      req.ownerKey = `user:${payload.id}`;
      return next();
    } catch (err) {
      // invalid/expired token -> fall through to guest handling
    }
  }

  const guestId = req.headers['x-guest-id'];
  if (guestId) {
    req.ownerKey = `guest:${guestId}`;
    return next();
  }

  return res.status(400).json({ error: 'Missing auth token or X-Guest-Id header' });
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    req.ownerKey = `user:${payload.id}`;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { identify, requireAuth, JWT_SECRET };
