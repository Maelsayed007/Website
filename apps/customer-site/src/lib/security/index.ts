/**
 * Security utilities for Amieira Getaways
 * 
 * This module provides centralized security functionality:
 * - Audit logging for tracking security events
 * - Rate limiting for preventing brute force attacks
 */

export { logSecurityEvent, logPermissionDenied, type SecurityAction } from './audit-logger';
export { checkRateLimit, logAuthAttempt, getRateLimitStatus } from './rate-limiter';
