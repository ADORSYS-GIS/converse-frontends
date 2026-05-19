/**
 * Authentication error types and utilities
 * Provides user-friendly error messages for authentication failures
 */

/**
 * Error codes for authentication failures
 */
export type AuthErrorCode =
  | 'AUDIENCE_MISMATCH'
  | 'AUDIENCE_MISSING'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_REFRESH_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Authentication error with user-friendly messages
 */
export class AuthenticationError extends Error {
  public readonly code: AuthErrorCode;
  public readonly details?: string;

  constructor(code: AuthErrorCode, message: string, details?: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.details = details;
    
  }

  /**
   * Get a user-friendly message suitable for display in the UI
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'AUDIENCE_MISMATCH':
        return 'Authentication failed: Your account is not authorized to access this application. Please contact support if this issue persists.';
      
      case 'AUDIENCE_MISSING':
        return 'Authentication failed: The login response was invalid. Please try again.';
      
      case 'TOKEN_EXPIRED':
        return 'Your session has expired. Please log in again.';
      
      case 'TOKEN_INVALID':
        return 'Authentication failed: The login response was invalid. Please try again.';
      
      case 'TOKEN_REFRESH_FAILED':
        return 'Your session could not be refreshed. Please log in again.';
      
      case 'NETWORK_ERROR':
        return 'Unable to connect to the authentication service. Please check your internet connection and try again.';
      
      default:
        return 'An unexpected error occurred during authentication. Please try again.';
    }
  }
}

/**
 * Create an AuthenticationError from audience validation errors
 */
export function createAudienceError(errors: string[]): AuthenticationError {
  // Check for missing audience vs mismatched audience
  const hasMissingAudience = errors.some(e => 
    e.toLowerCase().includes('missing') || e.toLowerCase().includes('no audience')
  );

  if (hasMissingAudience) {
    return new AuthenticationError(
      'AUDIENCE_MISSING',
      'Token missing required audience claim',
      errors.join('; ')
    );
  }

  return new AuthenticationError(
    'AUDIENCE_MISMATCH',
    'Token audience does not match expected value',
    errors.join('; ')
  );
}

/**
 * Type guard to check if an error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Extract user-friendly message from any error
 */
export function getAuthErrorMessage(error: unknown): string {
  if (isAuthenticationError(error)) {
    return error.getUserMessage();
  }
  
  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'Unable to connect to the authentication service. Please check your internet connection and try again.';
    }
    
    if (message.includes('expired')) {
      return 'Your session has expired. Please log in again.';
    }
    
    // Return a generic message for security (don't leak internal details)
    return 'An error occurred during authentication. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}