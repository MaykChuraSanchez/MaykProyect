import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!databaseUrl)
    throw new Error('La base de datos de producción no está configurada.');
  return drizzle(neon(databaseUrl), { schema });
}
