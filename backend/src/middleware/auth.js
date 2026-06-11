import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smart_wristband_secret_key_123456';

export function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access denied: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Access denied: Invalid or expired token' });
  }
}

export function checkRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: `Access denied: Requires one of roles [${roles.join(', ')}]` });
    }
  };
}
