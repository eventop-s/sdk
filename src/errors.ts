// export class EventopError extends Error {
//   constructor(
//     message: string,
//     public statusCode?: number,
//     public code?: string,
//   ) {
//     super(message);
//     this.name = 'EventopError';
//   }
// }

// export class AuthenticationError extends EventopError {
//   constructor(message: string = 'Invalid API key') {
//     super(message, 401, 'authentication_error');
//     this.name = 'AuthenticationError';
//   }
// }

// export class InvalidRequestError extends EventopError {
//   constructor(message: string) {
//     super(message, 400, 'invalid_request');
//     this.name = 'InvalidRequestError';
//   }
// }

// export class NotFoundError extends EventopError {
//   constructor(message: string) {
//     super(message, 404, 'not_found');
//     this.name = 'NotFoundError';
//   }
// }