const jwt = require('jsonwebtoken');
const axios = require('axios');

// Middleware to authenticate JWT
exports.authenticate = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ msg: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'Malformed token' });

  try {
    const response = await axios.post(`${process.env.AUTH_SERVICE_URL}/verify-token`, { token });
    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      return res.status(401).json({ msg: 'Unauthorized: Invalid token' });
    }
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ msg: 'Unauthorized: Token verification failed' });
  }
};

// Middleware to authorize roles
exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.roles) {
    return res.status(403).json({ msg: 'Access denied: No roles found for the user' });
  }

  const userRoles = req.user.roles;
  const hasRole = roles.some((role) => userRoles.includes(role));
  if (!hasRole) {
    return res.status(403).json({ msg: `Access denied: User does not have required roles: ${roles.join(', ')}` });
  }

  next();
};
