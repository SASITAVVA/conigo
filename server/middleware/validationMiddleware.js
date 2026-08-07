/**
 * Common data parameter validation helper middlewares
 */

export const validateEmailSyntax = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const requireFields = (fields) => {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === '') {
        return res.status(400).json({ error: `Missing required parameter: ${field}` });
      }
    }
    next();
  };
};

export default {
  validateEmailSyntax,
  requireFields
};
