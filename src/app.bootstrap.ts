import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { SwaggerModule } from '@nestjs/swagger';
import {
  buildAuthCorsOptions,
  resolveOptionalAuthConfig,
} from './auth/config/auth.config';
import { HttpExceptionLoggingFilter } from './common/logging/http-exception-logging.filter';
import { createHttpRequestLogger } from './common/logging/http-request-logger.middleware';
import { buildSwaggerDocumentConfig } from './swagger/swagger.config';

export type ConfigureAppOptions = {
  enableSwagger?: boolean;
  env?: Record<string, string | undefined>;
};

export function configureApp(
  app: Pick<
    INestApplication,
    'enableCors' | 'use' | 'useGlobalFilters' | 'useGlobalPipes'
  >,
  options: ConfigureAppOptions = {},
) {
  const env = options.env ?? process.env;

  app.use(createHttpRequestLogger());
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionLoggingFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const authConfig = resolveOptionalAuthConfig(env);
  app.enableCors(
    authConfig
      ? buildAuthCorsOptions(authConfig)
      : { origin: true, credentials: true },
  );

  if (!options.enableSwagger) {
    return;
  }

  const config = buildSwaggerDocumentConfig();
  const document = SwaggerModule.createDocument(app as never, config);
  const documentFactory = () => document;
  SwaggerModule.setup('api', app as never, documentFactory);
}
