export type Environment = 'devnet' | 'mainnet';

export interface EventopConfig {
  apiKey: string;
  environment?: Environment;
  apiUrl?: string;
}

export interface CheckoutSessionParams {
  planId: string;
  customerEmail: string;
  customerId?: string;
  successUrl: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  expiresAt: string;
}

export interface Subscription {
  subscriptionPda: string;
  userWallet: string;
  merchantWallet: string;
  planId: string;
  feeAmount: string;
  paymentInterval: string;
  isActive: boolean;
  totalPaid: string;
  paymentCount: number;
  createdAt: string;
  cancelledAt?: string;
}

export interface Customer {
  email: string;
  customerId?: string;
  walletAddress: string;
  subscriptions: Subscription[];
}

export interface WebhookPayload {
  event: string;
  timestamp: number;
  data: any;
}