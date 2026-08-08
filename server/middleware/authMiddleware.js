import { supabaseAdmin } from '../services/supabase.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token || req.headers['x-access-token']);
  
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token || req.headers['x-access-token']);
  
  if (token) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) req.user = user;
    } catch (err) {
      // Ignore
    }
  }
  next();
};

export const checkAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token || req.headers['x-access-token']);
  
  if (!token) return res.status(401).json({ error: 'Authentication required for Admin Access.' });
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token.' });
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile && profile.role === 'admin') {
      req.user = { ...user, role: 'admin' };
      next();
    } else {
      res.status(403).json({ error: 'Administrative privileges required.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const verifyToken = async (token) => {
    try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        return user;
    } catch (e) {
        return null;
    }
}

export default {
  requireAuth,
  optionalAuth,
  verifyToken,
  checkAdmin
};
