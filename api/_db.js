import { neon } from '@neondatabase/serverless';

const { NEON_URL } = process.env;
if (!NEON_URL) throw new Error('Falta la variable de entorno NEON_URL');

export const sql = neon(NEON_URL);


