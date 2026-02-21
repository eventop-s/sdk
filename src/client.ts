// import fetch from 'node-fetch';
// import { EventopConfig, Environment } from './types';
// import { EventopError, AuthenticationError } from './errors';

// export class EventopClient {
//   private apiKey: string;
//   private baseUrl: string;

//   constructor(config: EventopConfig) {
//     this.apiKey = config.apiKey;

//     // Set base URL based on environment
//     if (config.apiUrl) {
//       this.baseUrl = config.apiUrl;
//     } else {
//       const env = config.environment || this.detectEnvironment();
//       this.baseUrl =
//         env === 'devnet'
//           ? 'https://eventop-server-app-production.up.railway.app'
//           : 'https://api.eventop.xyz';
//     }
//   }

//   private detectEnvironment(): Environment {
//     // Detect from API key prefix
//     if (this.apiKey.startsWith('sk_test_')) {
//       return 'devnet';
//     } else if (this.apiKey.startsWith('sk_live_')) {
//       return 'mainnet';
//     }
//     throw new AuthenticationError('Invalid API key format');
//   }

//   async request<T>(
//     method: string,
//     path: string,
//     body?: any,
//   ): Promise<T> {
//     const url = `${this.baseUrl}${path}`;

//     const headers: Record<string, string> = {
//       'Authorization': `Bearer ${this.apiKey}`,
//       'Content-Type': 'application/json',
//     };

//     const response = await fetch(url, {
//       method,
//       headers,
//       body: body ? JSON.stringify(body) : undefined,
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new EventopError(
//         data.message || 'Request failed',
//         response.status,
//         data.code,
//       );
//     }

//     return data as T;
//   }
// }