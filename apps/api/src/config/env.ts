import { URL } from 'node:url';

export interface ApiEnvironment {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly port: number;
  readonly databaseUrl: string;
  readonly corsOrigins: readonly string[];
  readonly jwtIssuer: string;
  readonly jwtAudience: string;
  readonly jwtAccessSecret: string;
  readonly jwtRefreshSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly cookieSecure: boolean;
}

const unsafeSecretMarkers = [
  'replace',
  'change',
  'example',
  'secret',
  'password',
  'todo',
];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

function integer(name: string, fallback: number, minimum: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }
  return value;
}

function boolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  throw new Error(`${name} must be true or false`);
}

function secret(name: string): string {
  const value = required(name);
  const normalized = value.toLowerCase();
  if (value.length < 32 || unsafeSecretMarkers.some((marker) => normalized.includes(marker))) {
    throw new Error(`${name} must be a unique random value of at least 32 characters`);
  }
  return value;
}

function parseOrigins(value: string | undefined): readonly string[] {
  const origins = (value ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('API_CORS_ORIGINS must contain one or more explicit origins and never *');
  }

  for (const origin of origins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`API_CORS_ORIGINS contains an invalid origin: ${origin}`);
    }
  }

  return Object.freeze([...new Set(origins)]);
}

export function loadEnvironment(): ApiEnvironment {
  const rawNodeEnv = process.env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(rawNodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const nodeEnv = rawNodeEnv as ApiEnvironment['nodeEnv'];
  const databaseUrl = required('DATABASE_URL');
  const database = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    throw new Error('DATABASE_URL must use a PostgreSQL protocol');
  }

  const environment: ApiEnvironment = {
    nodeEnv,
    port: integer('API_PORT', 3001, 1),
    databaseUrl,
    corsOrigins: parseOrigins(process.env.API_CORS_ORIGINS),
    jwtIssuer: process.env.JWT_ISSUER?.trim() || 'pmcs-api',
    jwtAudience: process.env.JWT_AUDIENCE?.trim() || 'pmcs-web',
    jwtAccessSecret: secret('JWT_ACCESS_SECRET'),
    jwtRefreshSecret: secret('JWT_REFRESH_SECRET'),
    accessTokenTtlSeconds: integer('ACCESS_TOKEN_TTL_SECONDS', 900, 60),
    refreshTokenTtlSeconds: integer('REFRESH_TOKEN_TTL_SECONDS', 2_592_000, 3_600),
    cookieSecure: boolean('COOKIE_SECURE', nodeEnv === 'production'),
  };

  if (environment.nodeEnv === 'production' && !environment.cookieSecure) {
    throw new Error('COOKIE_SECURE must be true in production');
  }
  if (environment.jwtAccessSecret === environment.jwtRefreshSecret) {
    throw new Error('JWT access and refresh secrets must be distinct');
  }
  return Object.freeze(environment);
}
