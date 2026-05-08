import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { configureApp } from './app.bootstrap';

jest.mock('cookie-parser', () => jest.fn(() => 'cookie-parser-middleware'));

describe('configureApp', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTH_ACCESS_TOKEN_SECRET: 'access-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret',
      AUTH_ALLOWED_ORIGINS: 'http://localhost:5173',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('applies production middleware and validation defaults', () => {
    const app = {
      use: jest.fn(),
      useGlobalPipes: jest.fn(),
      enableCors: jest.fn(),
    };

    configureApp(app as never, { enableSwagger: false });

    expect(app.use).toHaveBeenCalledWith('cookie-parser-middleware');
    expect(app.useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['http://localhost:5173'],
      credentials: true,
    });
  });

  it('wires swagger only when explicitly enabled', () => {
    const createDocument = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue({ openapi: '3.0.0', info: { title: 'test' } } as never);
    const setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation();
    const app = {
      use: jest.fn(),
      useGlobalPipes: jest.fn(),
      enableCors: jest.fn(),
    };

    configureApp(app as never, { enableSwagger: true });

    expect(createDocument).toHaveBeenCalled();
    expect(setup).toHaveBeenCalledWith('api', app, expect.any(Function));
  });
});
