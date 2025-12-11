import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { AuthGuard } from './auth/middleware/authentication.middleware';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser for multipart/form-data
  });
  app.setGlobalPrefix('api/v1');

  // ========================================
  // SECURITY MIDDLEWARE
  // ========================================

  // 1. Helmet - Set security HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 2. Rate Limiting - DISABLED for development (user makes thousands of requests)
  // Uncomment in production with appropriate limits
  // const limiter = rateLimit({
  //   windowMs: 15 * 60 * 1000, // 15 minutes
  //   max: 10000, // High limit for production
  //   message: 'Too many requests from this IP, please try again later.',
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // });
  // app.use(limiter);

  // Stricter rate limiting for authentication endpoints - DISABLED
  // const authLimiter = rateLimit({
  //   windowMs: 15 * 60 * 1000,
  //   max: 100, // Increased for production
  //   skipSuccessfulRequests: true,
  // });
  // app.use('/api/v1/auth/login', authLimiter);
  // app.use('/api/v1/auth/register', authLimiter);

  // 3. NoSQL Injection Protection - Using custom middleware in app.module.ts
  // See: NoSQLSanitizeMiddleware applied globally to all routes

  // 4. HTTP Parameter Pollution Protection
  app.use(hpp());
  
  // 5. CORS Configuration - Secure cross-origin requests
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3001/api/v1',
    'http://localhost:3000/api/v1',
    'http://52.44.26.177',
    'http://52.44.26.177/api/v1',
    'https://www.onestaff.digital',
    'https://www.onestaff.digital/api/v1',
    'https://onestaff.digital',
    'https://onestaff.digital/api/v1',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`[SECURITY] Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Cookie',
      'Accept',
      'Accept-Encoding',
      'Accept-Language',
      'X-Requested-With',
      'X-CSRF-TOKEN',
    ],
    exposedHeaders: ['Set-Cookie', 'X-CSRF-TOKEN'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
  });

  // 6. Body Parser - Limit payload size to prevent DoS
  const express = require('express');
  app.use(
    express.json({
      limit: '10mb', // Reduced from 50mb for security
      verify: (req: any, res: any, buf: Buffer) => {
        // Store raw body for webhook verification if needed
        req.rawBody = buf.toString();
      },
    }),
  );
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 7. Cookie Parser with secret for signed cookies
  const cookieSecret = process.env.COOKIE_SECRET || 'your-secret-key-change-in-production';
  app.use(cookieParser(cookieSecret));

  // 8. Static Files - Serve with security headers
  const path = require('path');
  app.use(
    '/offer-letters',
    (req: any, res: any, next: any) => {
      // Add security headers for static files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      next();
    },
    express.static(path.join(process.cwd(), 'uploads', 'offer-letters')),
  );

  // 9. Global Validation Pipe - Input validation and sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove any extra fields not in DTO
      forbidNonWhitelisted: true, // Throw error for unknown fields
      transform: true, // Convert string inputs to expected type
      disableErrorMessages: process.env.NODE_ENV === 'production', // Hide detailed errors in production
      transformOptions: {
        enableImplicitConversion: false, // Require explicit type conversion
      },
    }),
  );

  // Apply authentication guard globally so `request.user` is populated
  // AuthGuard depends on JwtService and Reflector which are available as providers
  const reflector = app.get(Reflector);
  const jwtService = app.get(JwtService);
  app.useGlobalGuards(new AuthGuard(jwtService, reflector));

  await app.listen(process.env.PORT || 3000);
  console.log(`✅ Server running on port ${process.env.PORT || 3000}`);
}
bootstrap();