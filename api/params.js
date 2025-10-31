// api/params.js
import { listParams, insertParam } from './_db.js';

export default async function handler(req, res) {
  // Permite Vercel Functions (Node) o Edge-like
  if (req.method === 'GET') {
    const rows = await listParams();
    return res.status(200).json(rows);
  }
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const row = await insertParam(body);
      return res.status(201).json(row);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

