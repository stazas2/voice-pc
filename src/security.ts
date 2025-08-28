import { Request, Response, NextFunction } from 'express';
import { RateLimitEntry } from './types';
import { logger } from './logger';

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

export class SecurityManager {
  private rateLimits: Map<string, RateLimitEntry> = new Map();

  constructor(private aliceToken: string) {
    // Clean up rate limits every 5 minutes
    setInterval(() => this.cleanupRateLimits(), 5 * 60 * 1000);
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [ip, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(ip);
      }
    }
  }

  private getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = this.getClientIp(req);
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