import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'northstar'}`;

declare global {
  var __northstarPgPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const db: Pool = global.__northstarPgPool || createPool();

if (process.env.NODE_ENV !== 'production') {
  global.__northstarPgPool = db;
}

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await db.query(text, params as never[]);
  return result.rows as T[];
}

export async function closeDb(): Promise<void> {
  await db.end();
}
