import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

const TEST_DATABASE_NAME_HINT = /(^|[-_])test($|[-_])/i;

export function getRequiredTestDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const databaseUrlTest = env.DATABASE_URL_TEST?.trim();

  if (!databaseUrlTest) {
    throw new Error('DATABASE_URL_TEST is required for npm run test:e2e');
  }

  const databaseUrl = env.DATABASE_URL?.trim();

  if (databaseUrl && databaseUrl === databaseUrlTest) {
    throw new Error(
      'DATABASE_URL_TEST must not point to the same database as DATABASE_URL',
    );
  }

  const parsedUrl = new URL(databaseUrlTest);
  const databaseName = parsedUrl.pathname.replace(/^\//, '');

  if (!TEST_DATABASE_NAME_HINT.test(databaseName)) {
    throw new Error(
      'DATABASE_URL_TEST must target a database whose name clearly indicates test usage',
    );
  }

  return databaseUrlTest;
}

export function setProcessDatabaseUrlForE2E(env: NodeJS.ProcessEnv) {
  env.DATABASE_URL = getRequiredTestDatabaseUrl(env);
}

export function prepareE2EDatabase(env: NodeJS.ProcessEnv) {
  const databaseUrl = getRequiredTestDatabaseUrl(env);

  runPrismaCommand(['migrate', 'reset', '--force'], databaseUrl);
  runPrismaCommand(['db', 'seed'], databaseUrl);
}

function runPrismaCommand(args: string[], databaseUrl: string) {
  execFileSync(resolvePrismaCommand(), resolvePrismaArgs(args), {
    env: {
      ...sanitizeEnv(process.env),
      DATABASE_URL: databaseUrl,
      DATABASE_URL_TEST: databaseUrl,
    },
    stdio: 'inherit',
  });
}

function sanitizeEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

function resolvePrismaCommand() {
  return process.execPath;
}

function resolvePrismaArgs(args: string[]) {
  return [path.resolve('node_modules', 'prisma', 'build', 'index.js'), ...args];
}
