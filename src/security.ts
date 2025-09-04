import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { RateLimitEntry } from './types';
import { logger } from './logger';

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50; // Increased for dashboard usage
const TIMESTAMP_TOLERANCE = 5 * 60 * 1000; // 5 minutes tolerance for timestamp
const IDEMPOTENCY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL for idempotency cache

export class SecurityManager {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private idempotencyCache: Map<string, { timestamp: number; response: any }> = new Map();

  constructor(private aliceToken: string) {
    // Clean up rate limits and idempotency cache every 5 minutes
    setInterval(() => {
      this.cleanupRateLimits();
      this.cleanupIdempotencyCache();
    }, 5 * 60 * 1000);
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [ip, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(ip);
      }
    }
  }

  private cleanupIdempotencyCache(): void {
    const now = Date.now();
    for (const [requestId, entry] of this.idempotencyCache.entries()) {
      if (now - entry.timestamp > IDEMPOTENCY_CACHE_TTL) {
        this.idempotencyCache.delete(requestId);
      }
    }
  }

  private generateHmacSignature(body: string, timestamp: string): string {
    const payload = `${timestamp}.${body}`;
    return createHmac('sha256', this.aliceToken).update(payload).digest('hex');
  }

  private verifyHmacSignature(signature: string, body: string, timestamp: string): boolean {
    if (!signature || !timestamp) {
      return false;
    }

    const expectedSignature = this.generateHmacSignature(body, timestamp);
    const providedSignature = signature.replace('sha256=', '');
    
    if (expectedSignature.length !== providedSignature.length) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  private isTimestampValid(timestamp: string): boolean {
    const now = Date.now();
    const requestTime = parseInt(timestamp) * 1000; // Convert from seconds to milliseconds
    
    if (isNaN(requestTime)) {
      return false;
    }

    const timeDiff = Math.abs(now - requestTime);
    return timeDiff <= TIMESTAMP_TOLERANCE;
  }

  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = this.getClientIp(req);
    
    // Skip rate limiting for localhost/dashboard
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') {
      next();
      return;
    }
    
    const now = Date.now();
    
    let entry = this.rateLimits.get(ip);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        ip,
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW
      };
      this.rateLimits.set(ip, entry);
    }

    entry.count++;

    if (entry.count > MAX_REQUESTS_PER_WINDOW) {
      logger.error(`Rate limit exceeded for IP: ${ip}`, { 
        count: entry.count, 
        resetTime: new Date(entry.resetTime).toISOString() 
      });
      
      res.status(429).json({
        ok: false,
        error: 'Rate limit exceeded. Try again later.'
      });
      return;
    }

    next();
  };

  hmacMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Skip HMAC for local requests (dashboard, health checks)
    const ip = this.getClientIp(req);
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'unknown' || req.path === '/health' || req.path === '/status') {
      next();
      return;
    }

    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const requestId = req.headers['x-request-id'] as string;

    // Check for required headers
    if (!signature || !timestamp) {
      logger.error('Missing HMAC headers', { ip, path: req.path });
      res.status(400).json({
        ok: false,
        error: 'Missing X-Signature or X-Timestamp headers'
      });
      return;
    }

    // Validate timestamp
    if (!this.isTimestampValid(timestamp)) {
      logger.error('Invalid timestamp', { ip, timestamp, path: req.path });
      res.status(400).json({
        ok: false,
        error: 'Request timestamp is too old or invalid'
      });
      return;
    }

    // Verify HMAC signature
    const body = JSON.stringify(req.body);
    if (!this.verifyHmacSignature(signature, body, timestamp)) {
      logger.error('Invalid HMAC signature', { ip, path: req.path });
      res.status(401).json({
        ok: false,
        error: 'Invalid signature'
      });
      return;
    }

    // Store request ID for idempotency if provided
    if (requestId) {
      const cachedResponse = this.idempotencyCache.get(requestId);
      if (cachedResponse) {
        logger.info('Returning cached response for idempotent request', { requestId, ip });
        res.json(cachedResponse!.response);
        return;
      }
      // Store request ID in request for later use
      (req as any).requestId = requestId;
    }

    next();
  };

  authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers['x-alice-token'] as string;
    
    if (!token || token !== this.aliceToken) {
      const ip = this.getClientIp(req);
      logger.error(`Authentication failed for IP: ${ip}`, { 
        providedToken: token ? 'provided' : 'missing',
        path: req.path 
      });
      
      res.status(401).json({
        ok: false,
        error: 'Unauthorized. Invalid or missing X-ALICE-TOKEN header.'
      });
      return;
    }

    next();
  };

  storeResponseMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).requestId;
    
    if (requestId) {
      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        // Cache successful responses only
        if (data.ok !== false) {
          this.idempotencyCache.set(requestId, {
            timestamp: Date.now(),
            response: data
          });
        }
        return originalJson(data);
      };
    }
    
    next();
  };

  logRequestMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = this.getClientIp(req);
    logger.info(`${req.method} ${req.path}`, { 
      ip, 
      userAgent: req.headers['user-agent'],
      body: req.method === 'POST' ? req.body : undefined
    });
    next();
  };
}

export const createSecurityManager = (token: string) => new SecurityManager(token);