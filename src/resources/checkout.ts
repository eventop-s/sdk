import { EventopClient } from '../client';
import { CheckoutSessionParams, CheckoutSession } from '../types';

export class Checkout {
  constructor(private client: EventopClient) {}

  async create(params: CheckoutSessionParams): Promise<CheckoutSession> {
    return this.client.request<CheckoutSession>(
      'POST',
      '/checkout/create',
      params,
    );
  }

  async get(sessionId: string): Promise<any> {
    return this.client.request('GET', `/checkout/${sessionId}`);
  }

  async cancel(sessionId: string): Promise<any> {
    return this.client.request('POST', `/checkout/${sessionId}/cancel`);
  }
}