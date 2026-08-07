import express from 'express';
import * as chatController from '../controllers/chatController.js';

const router = express.Router();

router.post('/', chatController.handleChatMessage);
router.get('/history', chatController.getChatHistory);
router.put('/:id/rename', chatController.renameConversation);
router.delete('/:id', chatController.deleteConversation);

export default router;
