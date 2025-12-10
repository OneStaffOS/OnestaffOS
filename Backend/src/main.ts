import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { AuthGuard } from './auth/middleware/authentication.middleware';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser for multipart/form-data
  });
  app.setGlobalPrefix('api/v1');
  
  // Enhanced CORS for multipart/form-data
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000',' https://onestaffos.digital','https://www.onestaffos.digital'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept', 'Accept-Encoding', 'Accept-Language'],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Body parser for JSON and urlencoded (but not for multipart)
  const express = require('express');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // Serve static files for offer letters
  const path = require('path');
  app.use('/offer-letters', express.static(path.join(process.cwd(), 'uploads', 'offer-letters')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:true, //remove any extra fields not in DTO
      forbidNonWhitelisted:true,// instead of removing it , it throws an error
      transform:true // convert string  inputs to its expected type
    })
  )
  app.use(cookieParser());

  // Apply authentication guard globally so `request.user` is populated
  // AuthGuard depends on JwtService and Reflector which are available as providers
  const reflector = app.get(Reflector);
  const jwtService = app.get(JwtService);
  app.useGlobalGuards(new AuthGuard(jwtService, reflector));

  await app.listen(process.env.PORT || 3000);
  console.log(`✅ Server running on port ${process.env.PORT || 3000}`);
}
bootstrap();
