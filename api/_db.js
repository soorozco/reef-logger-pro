// api/_db.js
import { neon } from '@neondatabase/serverless';

const { NEON_URL } = process.env;
if (!NEON_URL) {
  throw new Error('Falta la variable de entorno NEON_URL');
}
export const sql = neon(NEON_URL);

// Helpers tabla "params"
export async function listParams() {
  return await sql/*sql*/`
    select id, date, temp, salinity, ph, alk, ca, mg, no3, po4, ammonia, nitrite
    from params
    order by date desc, id desc
  `;
}
export async function insertParam(b) {
  const [row] = await sql/*sql*/`
    insert into params (date, temp, salinity, ph, alk, ca, mg, no3, po4, ammonia, nitrite)
    values (${b.date}, ${b.temp}, ${b.salinity}, ${b.ph}, ${b.alk}, ${b.ca}, ${b.mg}, ${b.no3}, ${b.po4}, ${b.ammonia}, ${b.nitrite})
    returning id, date, temp, salinity, ph, alk, ca, mg, no3, po4, ammonia, nitrite
  `;
  return row;
}
export async function deleteParam(id) {
  await sql/*sql*/`delete from params where id = ${id}`;
  return { ok: true };
}

