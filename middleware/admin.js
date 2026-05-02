/**
 * Admin middleware — checks if authenticated user has admin privileges
 * Must be used AFTER authMiddleware
 */
function adminMiddleware(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;

    if (req.user.email !== adminEmail && !req.user.is_admin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (err) {
    console.error('Admin middleware error:', err);
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

module.exports = adminMiddleware;
