const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function auth(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing token' });
    }
    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, JWT_SECRET);
      if (requiredRole && payload.role !== requiredRole && payload.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.user = payload;
      next();
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = { auth, JWT_SECRET };


