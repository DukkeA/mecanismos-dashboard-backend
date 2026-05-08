import {
  getRequiredTestDatabaseUrl,
  setProcessDatabaseUrlForE2E,
} from './db-e2e';

describe('db e2e safety', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_TEST;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fails fast when DATABASE_URL_TEST is missing', () => {
    expect(() => getRequiredTestDatabaseUrl(process.env)).toThrow(
      'DATABASE_URL_TEST is required for npm run test:e2e',
    );
  });

  it('rejects DATABASE_URL_TEST when it matches DATABASE_URL', () => {
    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@localhost:5432/mecanismos';
    process.env.DATABASE_URL_TEST =
      'postgresql://postgres:postgres@localhost:5432/mecanismos';

    expect(() => getRequiredTestDatabaseUrl(process.env)).toThrow(
      'DATABASE_URL_TEST must not point to the same database as DATABASE_URL',
    );
  });

  it('accepts a dedicated test database and maps it into DATABASE_URL for Prisma commands', () => {
    process.env.DATABASE_URL =
      'postgresql://postgres:postgres@localhost:5432/mecanismos';
    process.env.DATABASE_URL_TEST =
      'postgresql://postgres:postgres@localhost:5432/mecanismos_test';

    const databaseUrl = getRequiredTestDatabaseUrl(process.env);

    expect(databaseUrl).toContain('mecanismos_test');

    setProcessDatabaseUrlForE2E(process.env);

    expect(process.env.DATABASE_URL).toBe(process.env.DATABASE_URL_TEST);
  });
});
