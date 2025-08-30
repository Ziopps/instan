import crypto from 'crypto';

/**
 * Middleware untuk validasi & keamanan
 */

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

export const rateLimiter = (req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Clean old entries
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.firstRequest > RATE_LIMIT_WINDOW) {
      requestCounts.delete(key);
    }
  }
  
  // Check current client
  const clientData = requestCounts.get(clientId);
  
  if (!clientData) {
    requestCounts.set(clientId, {
      count: 1,
      firstRequest: now
    });
  } else {
    if (now - clientData.firstRequest > RATE_LIMIT_WINDOW) {
      // Reset window
      requestCounts.set(clientId, {
        count: 1,
        firstRequest: now
      });
    } else {
      clientData.count++;
      if (clientData.count > MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - clientData.firstRequest)) / 1000)
        });
      }
    }
  }
  
  next();
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Request validation middleware
 */
export const validateContentType = (req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(400).json({
      success: false,
      error: 'Content-Type must be application/json'
    });
  }
  next();
};

/**
 * HMAC signature validation for callbacks
 */
export const validateHMACSignature = (secret) => {
  return (req, res, next) => {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!signature || !timestamp) {
      return res.status(401).json({
        success: false,
        error: 'Missing signature or timestamp'
      });
    }
    
    // Check timestamp (prevent replay attacks)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > 300000) { // 5 minutes
      return res.status(401).json({
        success: false,
        error: 'Request timestamp too old'
      });
    }
    
    // Validate signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    if (!crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }
    
    next();
  };
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
      timestamp: new Date().toISOString()
    });
  });
  
  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(isDevelopment && { details: err.message, stack: err.stack }),
    timestamp: new Date().toISOString()
  });
};

/**
 * CORS middleware
 */
export const corsHandler = (req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Signature, X-Timestamp');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};