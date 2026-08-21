import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth';
import { aiRateLimiter } from '../middlewares/aiRateLimiter';

const router = Router();

// All AI endpoints require authentication and dedicated rate limiting
router.use(authenticate);
router.use(aiRateLimiter);

// Chat & Conversation Endpoints
router.post('/chat', aiController.sendMessage);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id', aiController.getConversation);
router.delete('/conversations/:id', aiController.deleteConversation);
router.post('/conversations/:id/clear', aiController.clearConversation);

// Specialized AI Tutor Actions
router.post('/summarize', aiController.summarizeLesson);
router.post('/practice/generate', aiController.generatePractice);
router.post('/practice/evaluate', aiController.evaluatePractice);
router.post('/code-help', aiController.explainCode);
router.post('/study-plan', aiController.createStudyPlan);
router.get('/recommendations', aiController.getRecommendations);

export default router;
