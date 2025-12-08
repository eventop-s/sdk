import { EventopClient } from '../client';
import { Subscription } from '../types';

export class Subscriptions {
  constructor(private client: EventopClient) {}

  async list(): Promise<Subscription[]> {
    return this.client.request<Subscription[]>('GET', '/subscriptions');
  }

  async get(subscriptionId: string): Promise<Subscription> {
    return this.client.request<Subscription>(
      'GET',
      `/subscriptions/${subscriptionId}`,
    );
  }

  async cancel(subscriptionId: string): Promise<any> {
    return this.client.request(
      'POST',
      `/subscriptions/${subscriptionId}/cancel`,
    );
  }
}