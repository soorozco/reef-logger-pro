// api/params.js
import { sql, list, remove, getBody } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await list('params'));
    }
    if (req.method === 'POST') {
      const b = await getBody(req);
      const rows = await sql`
        insert into params (date, temp, salinity, ph, alk, ca, mg, no3, po4, ammonia, nitrite)
        values (${b.date}, ${b.temp}, ${b.salinity}, ${b.ph}, ${b.alk}, ${b.ca}, ${b.mg}, ${b.no3}, ${b.po4}, ${b.ammonia}, ${b.nitrite})
        returning *`;
      return res.status(201).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id requerido' });
      await remove('params', id);
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET,POST,DELETE');
    return res.status(405).end('Method Not Allowed');
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
