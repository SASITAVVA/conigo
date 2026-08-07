/**
 * Upload payload validation middleware for PDF documents and learning materials
 */

export const validateDocumentUpload = (req, res, next) => {
  if (!req.body || (!req.body.pages && !req.body.text && !req.body.documentTitle && !req.body.title)) {
    // Permit standard requests that might rely on custom payload keys
    return next();
  }
  const pages = req.body.pages || [];
  if (!Array.isArray(pages) && typeof req.body.text !== 'string') {
    return res.status(400).json({ error: 'Invalid upload format. Must include document text or pages array.' });
  }
  next();
};

export default {
  validateDocumentUpload
};
