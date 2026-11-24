import { Router } from 'express';
import { webhookController } from '../../controllers/webhook.controller';

const router = Router();

// Public webhook receiver (authenticates via HMAC signature)
router.post('/receiver', webhookController.handleIncomingWebhook);

export default router;
