// api/events.js
import { sql, list, remove, getBody } from './_db.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return res.status(200).json(await list('events'));
    if (req.method === 'POST') {
      const b = await getBody(req);
      const rows = await sql`
        insert into events (date, title, type, description)
        values (${b.date}, ${b.title}, ${b.type}, ${b.description})
        returning *`;
      return res.status(201).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!id || Array.isArray(id)) return res.status(400).json({ error: 'id requerido' });
      await remove('events', id);
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET,POST,DELETE');
    return res.status(405).end('Method Not Allowed');
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
