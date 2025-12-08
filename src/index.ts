import { EventopClient } from './client';
import { Checkout } from './resources/checkout';
import { Subscriptions } from './resources/subscriptions';
import { Webhooks } from './resources/webhooks';
import { EventopConfig } from './types';

export class Eventop {
  public checkout: Checkout;
  public subscriptions: Subscriptions;
  public webhooks: Webhooks;

  constructor(config: EventopConfig) {
    const client = new EventopClient(config);

    this.checkout = new Checkout(client);
    this.subscriptions = new Subscriptions(client);
    this.webhooks = new Webhooks(client);
  }
}

export * from './types';
export * from './errors';