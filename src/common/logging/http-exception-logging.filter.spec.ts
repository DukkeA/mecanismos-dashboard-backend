import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpExceptionLoggingFilter } from './http-exception-logging.filter';

describe('HttpExceptionLoggingFilter', () => {
  it('logs 4xx exception messages and preserves the response body', () => {
    const logger = createLoggerMock();
    const filter = new HttpExceptionLoggingFilter(logger);
    const response = createResponse();

    filter.catch(
      new NotFoundException('Cost center abc not found'),
      createHost(createRequest('POST', '/employees?token=secret'), response),
    );

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'requestId=request-from-response POST /employees?token=%5BREDACTED%5D 404 Cost center abc not found',
      ),
    );
    expect(response.statusMock).toHaveBeenCalledWith(404);
    expect(response.jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Cost center abc not found',
        statusCode: 404,
      }),
    );
  });

  it('logs 5xx errors without exposing the original error message to clients', () => {
    const logger = createLoggerMock();
    const filter = new HttpExceptionLoggingFilter(logger);
    const response = createResponse();

    filter.catch(
      new Error('Database password leaked here'),
      createHost(createRequest('GET', '/boom'), response),
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('requestId=request-from-response GET /boom 500'),
      expect.any(String),
    );
    expect(response.jsonMock).toHaveBeenCalledWith({
      message: 'Internal server error',
      statusCode: 500,
    });
  });
});

function createLoggerMock() {
  return {
    error: jest.fn(),
    warn: jest.fn(),
  };
}

function createRequest(method: string, url: string) {
  return {
    get: jest.fn(),
    method,
    originalUrl: url,
    url,
  } as unknown as Request;
}

function createResponse() {
  const response = {
    getHeader: jest.fn((headerName: string) =>
      headerName.toLowerCase() === 'x-request-id'
        ? 'request-from-response'
        : undefined,
    ),
    headersSent: false,
    jsonMock: jest.fn(),
    statusMock: jest.fn(),
  };
  response.statusMock.mockReturnValue({ json: response.jsonMock });

  return {
    getHeader: response.getHeader,
    headersSent: response.headersSent,
    jsonMock: response.jsonMock,
    status: response.statusMock,
    statusMock: response.statusMock,
  } as unknown as Response & {
    jsonMock: jest.Mock;
    statusMock: jest.Mock;
  };
}

function createHost(request: Request, response: Response): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}
