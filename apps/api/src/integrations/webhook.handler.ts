import crypto from 'crypto';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

// In-memory or Redis-backed cache for processed webhook event IDs
const processedWebhookEvents = new Set<string>();

export class WebhookHandler {
  /**
   * Verifies HMAC-SHA256 signature on incoming webhooks to ensure authenticity.
   */
  public static verifySignature(
    payload: string,
    signatureHeader: string | undefined,
    secret: string
  ): boolean {
    if (!signatureHeader) {
      throw new UnauthorizedError('Missing required webhook signature header', 'WEBHOOK_SIGNATURE_MISSING');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const sigBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      logger.warn('Webhook signature verification failed');
      throw new UnauthorizedError('Invalid webhook signature', 'WEBHOOK_SIGNATURE_INVALID');
    }

    return true;
  }

  /**
   * Prevents replay attacks by checking event idempotency.
   */
  public static isDuplicateEvent(eventId: string): boolean {
    if (processedWebhookEvents.has(eventId)) {
      return true;
    }
    processedWebhookEvents.add(eventId);
    // Keep set bounded: remove after 1 hour (unref so timer doesn't hold process open)
    const timer = setTimeout(() => processedWebhookEvents.delete(eventId), 3600 * 1000);
    if (timer.unref) {
      timer.unref();
    }
    return false;
  }
}
