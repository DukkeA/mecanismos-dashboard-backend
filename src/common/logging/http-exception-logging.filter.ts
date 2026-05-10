import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { sanitizeUrl } from './http-request-logger.middleware';

type ExceptionLogger = Pick<Logger, 'error' | 'warn'>;

@Catch()
export class HttpExceptionLoggingFilter implements ExceptionFilter {
  private readonly logger: ExceptionLogger;

  constructor(logger: ExceptionLogger = new Logger('HTTP Exception')) {
    this.logger = logger;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode = resolveStatusCode(exception);
    const responseBody = resolveResponseBody(exception, statusCode);
    const requestId = resolveRequestId(request, response);
    const logMessage = [
      `requestId=${requestId}`,
      request.method,
      sanitizeUrl(request.originalUrl || request.url),
      statusCode,
      extractResponseMessage(responseBody),
    ].join(' ');

    if (statusCode >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(logMessage);
    }

    if (response.headersSent) {
      return;
    }

    response.status(statusCode).json(responseBody);
  }
}

function resolveStatusCode(exception: unknown) {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function resolveResponseBody(exception: unknown, statusCode: number) {
  if (!(exception instanceof HttpException)) {
    return {
      statusCode,
      message: 'Internal server error',
    };
  }

  const response = exception.getResponse();

  if (typeof response === 'string') {
    return {
      statusCode,
      message: response,
    };
  }

  return response;
}

function resolveRequestId(request: Request, response: Response) {
  const responseRequestId = response.getHeader('x-request-id');

  if (typeof responseRequestId === 'string' && responseRequestId.trim()) {
    return responseRequestId.trim();
  }

  return request.get('x-request-id')?.trim() || 'untracked';
}

function extractResponseMessage(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== 'object') {
    return 'unknown-error';
  }

  const message = (responseBody as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.join('; ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return 'unknown-error';
}
