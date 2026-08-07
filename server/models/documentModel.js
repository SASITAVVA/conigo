import { db } from '../services/db.js';

export const documentModel = {
  getUserPdfs(userId) {
    const rawDb = db.getRawLocalDb();
    return (rawDb.pdf_uploads || []).filter(p => !userId || p.user_id === userId || p.userId === userId);
  },

  findPdfById(id) {
    const rawDb = db.getRawLocalDb();
    return (rawDb.pdf_uploads || []).find(d => d.id === id) || null;
  },

  addPdf(pdfDoc) {
    const rawDb = db.getRawLocalDb();
    if (!rawDb.pdf_uploads) rawDb.pdf_uploads = [];
    rawDb.pdf_uploads.unshift(pdfDoc);
    db.saveRawLocalDb(rawDb);
    return pdfDoc;
  },

  deletePdf(id) {
    const rawDb = db.getRawLocalDb();
    if (rawDb.pdf_uploads) {
      rawDb.pdf_uploads = rawDb.pdf_uploads.filter(d => d.id !== id);
    }
    if (rawDb.document_embeddings) {
      rawDb.document_embeddings = rawDb.document_embeddings.filter(e => e.document_id !== id);
    }
    db.saveRawLocalDb(rawDb);
  },

  getNotes(userId) {
    const rawDb = db.getRawLocalDb();
    return (rawDb.notes || []).filter(n => !userId || n.user_id === userId || n.userId === userId);
  }
};

export default documentModel;
