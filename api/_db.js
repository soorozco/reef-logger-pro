// api/_db.js
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('DATABASE_URL no está definido. Configúralo en Vercel / .env.local');
}
export const sql = neon(connectionString);

// Helpers genéricos
export async function list(table) {
  // Ordena por created_at desc si existe; si no, ignora
  try {
    const rows = await sql`select * from ${sql(table)} order by created_at desc`;
    return rows;
  } catch {
    const rows = await sql`select * from ${sql(table)}`;
    return rows;
  }
}

export async function remove(table, id) {
  await sql`delete from ${sql(table)} where id = ${id}`;
}

// Body parser seguro
export async function getBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  // Si Vercel no parseó, leemos el stream
  return await new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}
