import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import {
  buildAuthCorsOptions,
  resolveOptionalAuthConfig,
} from './auth/config/auth.config';
import { buildSwaggerDocumentConfig } from './swagger/swagger.config';

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

  const config = buildSwaggerDocumentConfig();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
