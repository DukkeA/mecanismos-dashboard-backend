import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import {
  createHttpRequestLogger,
  sanitizeUrl,
} from './http-request-logger.middleware';

describe('createHttpRequestLogger', () => {
  it('logs successful requests with a generated request id', () => {
    const logger = createLoggerMock();
    const middleware = createHttpRequestLogger({
      logger,
      now: createClock(100, 145),
      requestIdFactory: () => 'generated-request-id',
    });
    const response = createResponse(200);
    const next = jest.fn() as NextFunction;

    middleware(createRequest('GET', '/employees?page=1'), response, next);
    response.emit('finish');

    expect(response.setHeaderMock.mock.calls).toContainEqual([
      'x-request-id',
      'generated-request-id',
    ]);
    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining(
        'requestId=generated-request-id GET /employees?page=1 200 45ms',
      ),
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('warns for client errors and preserves incoming request ids', () => {
    const logger = createLoggerMock();
    const middleware = createHttpRequestLogger({
      logger,
      now: createClock(0, 12),
      requestIdFactory: () => 'unused-generated-id',
    });
    const response = createResponse(404);

    middleware(
      createRequest('POST', '/employees?password=secret', 'incoming-id'),
      response,
      jest.fn() as NextFunction,
    );
    response.emit('finish');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'requestId=incoming-id POST /employees?password=%5BREDACTED%5D 404 12ms',
      ),
    );
    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('errors for server failures', () => {
    const logger = createLoggerMock();
    const middleware = createHttpRequestLogger({ logger });
    const response = createResponse(500);

    middleware(
      createRequest('GET', '/boom'),
      response,
      jest.fn() as NextFunction,
    );
    response.emit('finish');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('GET /boom 500'),
    );
  });
});

describe('sanitizeUrl', () => {
  it('redacts sensitive query values without logging request bodies or cookies', () => {
    expect(
      sanitizeUrl('/auth/callback?token=abc&search=visible&refreshToken=def'),
    ).toBe(
      '/auth/callback?token=%5BREDACTED%5D&search=visible&refreshToken=%5BREDACTED%5D',
    );
  });
});

function createLoggerMock() {
  return {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  };
}

function createClock(...values: number[]) {
  let index = 0;

  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

function createRequest(method: string, url: string, requestId?: string) {
  return {
    get: jest.fn((headerName: string) =>
      headerName.toLowerCase() === 'x-request-id' ? requestId : undefined,
    ),
    method,
    originalUrl: url,
    url,
  } as unknown as Request;
}

function createResponse(statusCode: number) {
  const response = new EventEmitter() as EventEmitter &
    Response & {
      setHeaderMock: jest.Mock;
    };
  response.statusCode = statusCode;
  response.setHeaderMock = jest.fn();
  (response as unknown as { setHeader: Response['setHeader'] }).setHeader =
    response.setHeaderMock as Response['setHeader'];

  return response;
}
