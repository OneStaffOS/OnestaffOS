import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { AuthGuard } from './auth/middleware/authentication.middleware';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: 'http://localhost:3001', // Allow requests from Next.js server
    methods: 'GET,POST,PUT,PATCH,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization,Cookie',
  });

  // Increase body size limit for image uploads
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));
  // No temporary request-logging middleware in production.
  // Debug middleware removed per cleanup request.

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

  await app.listen(process.env.PORT || 5000);
  console.log(`✅ Server running on port ${process.env.PORT || 5000}`);
}
bootstrap();