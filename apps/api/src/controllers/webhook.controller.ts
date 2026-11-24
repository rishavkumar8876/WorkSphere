import { Request, Response, NextFunction } from 'express';
import { WebhookHandler } from '../integrations/webhook.handler';
import { sendSuccess } from '../utils/response';
import logger from '../utils/logger';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'worksphere_sandbox_webhook_secret_key';

export class WebhookController {
  async handleIncomingWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const rawBody = JSON.stringify(req.body);

      // 1. Verify HMAC Signature
      WebhookHandler.verifySignature(rawBody, signature, WEBHOOK_SECRET);

      const eventId = req.headers['x-event-id'] as string || req.body.id;
      if (eventId && WebhookHandler.isDuplicateEvent(eventId)) {
        logger.info(`Duplicate webhook event ignored: ${eventId}`);
        sendSuccess(res, { status: 'ignored_duplicate', eventId }, 200);
        return;
      }

      logger.info(`Processing external webhook event: ${req.body.event || 'unknown'}`);
      
      // Process payload
      sendSuccess(res, { status: 'processed', eventId }, 200, 'Webhook processed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
export default webhookController;
