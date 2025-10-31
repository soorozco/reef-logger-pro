// api/params.js
import { sql } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql/*sql*/`
        select id, date, temp, salinity, ph, alk, ca, mg, no3, po4, ammonia, nitrite
        from params
        order by date desc, id desc
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const [row] = await sql/*sql*/`
        insert into params (date, temp, salinity, ph, alk, ca, mg, no3, po4, ammonia, nitrite)
        values (${body.date}, ${body.temp}, ${body.salinity}, ${body.ph}, ${body.alk}, ${body.ca},
                ${body.mg}, ${body.no3}, ${body.po4}, ${body.ammonia}, ${body.nitrite})
        returning id, date, temp, salinity, ph, alk, ca, mg, no3, po4, ammonia, nitrite
      `;
      return res.status(201).json(row);
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!id) return res.status(400).json({ error: 'id requerido' });
      await sql/*sql*/`delete from params where id = ${id}`;
      return res.status(204).end();
    }

    // Opcional: preflight
    if (req.method === 'OPTIONS') return res.status(204).end();

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('params handler error', e);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}


