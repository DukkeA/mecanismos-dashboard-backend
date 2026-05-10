import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type RequestLogger = Pick<Logger, 'error' | 'log' | 'warn'>;

export type HttpRequestLoggerOptions = {
  logger?: RequestLogger;
  now?: () => number;
  requestIdFactory?: () => string;
};

const SENSITIVE_QUERY_KEYS = [
  'authorization',
  'cookie',
  'password',
  'refreshToken',
  'secret',
  'token',
];

export function createHttpRequestLogger(
  options: HttpRequestLoggerOptions = {},
) {
  const logger = options.logger ?? new Logger('HTTP');
  const now = options.now ?? Date.now;
  const requestIdFactory = options.requestIdFactory ?? randomUUID;

  return function httpRequestLogger(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    const startedAt = now();
    const requestId = resolveRequestId(
      request.get('x-request-id'),
      requestIdFactory,
    );

    response.setHeader('x-request-id', requestId);
    response.once('finish', () => {
      const durationMs = Math.max(0, Math.round(now() - startedAt));
      const statusCode = response.statusCode;
      const message = [
        `requestId=${requestId}`,
        request.method,
        sanitizeUrl(request.originalUrl || request.url),
        statusCode,
        `${durationMs}ms`,
      ].join(' ');

      if (statusCode >= 500) {
        logger.error(message);
        return;
      }

      if (statusCode >= 400) {
        logger.warn(message);
        return;
      }

      logger.log(message);
    });

    next();
  };
}

function resolveRequestId(
  requestIdHeader: string | undefined,
  requestIdFactory: () => string,
) {
  return requestIdHeader?.trim() || requestIdFactory();
}

export function sanitizeUrl(rawUrl: string) {
  try {
    const parsedUrl = new URL(rawUrl, 'http://internal.local');

    for (const key of Array.from(parsedUrl.searchParams.keys())) {
      if (isSensitiveQueryKey(key)) {
        parsedUrl.searchParams.set(key, '[REDACTED]');
      }
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return rawUrl.replace(
      /([?&][^=&]*(?:authorization|cookie|password|refreshToken|secret|token)[^=&]*=)[^&]*/gi,
      '$1[REDACTED]',
    );
  }
}

function isSensitiveQueryKey(key: string) {
  const normalizedKey = key.toLowerCase();

  return SENSITIVE_QUERY_KEYS.some((sensitiveKey) =>
    normalizedKey.includes(sensitiveKey.toLowerCase()),
  );
}
