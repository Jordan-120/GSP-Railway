// backend/middleware/roleMiddleware.js

// Usage:
//   const requireRole = require('./roleMiddleware');
//   router.get('/admin-only', authMiddleware, requireRole('Admin'), handler)

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const role = req.user.profile_type;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}

module.exports = requireRole;