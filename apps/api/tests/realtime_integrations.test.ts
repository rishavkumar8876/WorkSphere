import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import { WebhookHandler } from '../src/integrations/webhook.handler';

describe('Real-Time WebSockets, Queues & Third-Party Integrations', () => {
  const app = createApp();
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'worksphere_sandbox_webhook_secret_key';

  describe('1. Webhook Signature Verification & Idempotency (Assessment 08)', () => {
    it('should reject webhook request missing signature header (401)', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/receiver')
        .send({ event: 'payment.completed', id: 'evt-1' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WEBHOOK_SIGNATURE_MISSING');
    });

    it('should reject webhook request with forged or invalid signature (401)', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/receiver')
        .set('x-hub-signature-256', 'forged_fake_signature_hash')
        .send({ event: 'payment.completed', id: 'evt-1' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    });

    it('should successfully verify valid HMAC-SHA256 signature and process event', async () => {
      const payload = { event: 'project.external_sync', id: 'evt-unique-101' };
      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/webhooks/receiver')
        .set('x-hub-signature-256', signature)
        .set('x-event-id', 'evt-unique-101')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('processed');
    });

    it('should safely ignore duplicate webhook event (Idempotency guarantee)', async () => {
      const payload = { event: 'project.external_sync', id: 'evt-duplicate-202' };
      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      // First delivery
      const res1 = await request(app)
        .post('/api/v1/webhooks/receiver')
        .set('x-hub-signature-256', signature)
        .set('x-event-id', 'evt-duplicate-202')
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('processed');

      // Replay / Retried duplicate delivery
      const res2 = await request(app)
        .post('/api/v1/webhooks/receiver')
        .set('x-hub-signature-256', signature)
        .set('x-event-id', 'evt-duplicate-202')
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('ignored_duplicate');
    });
  });

  describe('2. WebhookHandler Unit Logic', () => {
    it('isDuplicateEvent returns true on second invocation for same eventId', () => {
      const eventId = `test-evt-${Date.now()}`;
      expect(WebhookHandler.isDuplicateEvent(eventId)).toBe(false);
      expect(WebhookHandler.isDuplicateEvent(eventId)).toBe(true);
    });
  });
});
