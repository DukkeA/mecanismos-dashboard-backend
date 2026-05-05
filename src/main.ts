import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import {
  buildAuthCorsOptions,
  resolveOptionalAuthConfig,
} from './auth/config/auth.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const authConfig = resolveOptionalAuthConfig(process.env);
  app.enableCors(
    authConfig
      ? buildAuthCorsOptions(authConfig)
      : { origin: true, credentials: true },
  );

  const config = new DocumentBuilder()
    .setTitle('Mecanismos Dashboard Backend')
    .setDescription(
      'Backend API for authentication and admin-protected dashboard access.',
    )
    .setVersion('1.0')
    .addTag('auth')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
