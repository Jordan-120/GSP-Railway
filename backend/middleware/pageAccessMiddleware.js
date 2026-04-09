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

async function loadUserFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, bearerToken] = authHeader.split(' ');
  const cookieToken = getCookieValue(req.headers.cookie, 'authToken');
  const token = scheme === 'Bearer' && bearerToken ? bearerToken : cookieToken;

  if (!token) return null;

  const decoded = verifyToken(token);
  const user = await User.findOne({
    where: { id: decoded.id, email: decoded.email },
    attributes: ['id', 'email', 'profile_type', 'is_verified'],
  });

  return user || null;
}

function clearAuthCookie(res) {
  res.clearCookie('authToken', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function requirePageRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const user = await loadUserFromRequest(req);

      if (!user || !user.is_verified || user.profile_type === 'Banned') {
        clearAuthCookie(res);
        return res.redirect('/');
      }

      if (!allowedRoles.includes(user.profile_type)) {
        if (user.profile_type === 'Admin') {
          return res.redirect('/adminView');
        }

        if (allowedRoles.includes('Admin')) {
          return res.redirect('/home');
        }

        return res.redirect('/');
      }

      req.user = {
        id: user.id,
        email: user.email,
        profile_type: user.profile_type,
        is_verified: user.is_verified,
      };

      return next();
    } catch (error) {
      clearAuthCookie(res);
      return res.redirect('/');
    }
  };
}

module.exports = {
  requirePageRole,
};
