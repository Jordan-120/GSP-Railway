const { verifyToken } = require('../utils/jwt');
const User = require('../models/userModel');

function getCookieValue(cookieHeader, cookieName) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const part of cookies) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === cookieName) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, bearerToken] = authHeader.split(' ');
    const cookieToken = getCookieValue(req.headers.cookie, 'authToken');
    const token = scheme === 'Bearer' && bearerToken ? bearerToken : cookieToken;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const decoded = verifyToken(token);

    const sqlUser = await User.findOne({
      where: { id: decoded.id, email: decoded.email },
      attributes: ['id', 'email', 'profile_type', 'is_verified'],
    });

    if (!sqlUser) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!sqlUser.is_verified) {
      return res.status(403).json({ message: 'Please verify your email first.' });
    }

    if (sqlUser.profile_type === 'Banned') {
      return res.status(403).json({ message: 'Your account has been banned.' });
    }

    req.user = {
      id: sqlUser.id,
      email: sqlUser.email,
      profile_type: sqlUser.profile_type,
      is_verified: sqlUser.is_verified,
    };

    return next();
  } catch (error) {
    console.error('JWT auth error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = protect;
