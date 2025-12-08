import * as crypto from 'crypto';
import { EventopClient } from '../client';
import { WebhookPayload } from '../types';

export class Webhooks {
  constructor(private client: EventopClient) {}

  verifySignature(
    payload: WebhookPayload | string,
    signature: string,
    secret: string,
  ): boolean {
    const payloadString =
      typeof payload === 'string' ? payload : JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  constructEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): WebhookPayload {
    const payloadString = Buffer.isBuffer(payload)
      ? payload.toString('utf8')
      : payload;

    if (!this.verifySignature(payloadString, signature, secret)) {
      throw new Error('Invalid webhook signature');
    }

    return JSON.parse(payloadString);
  }
}