import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // diagnostic: /api/data?check=1
  if (req.query && req.query.check) {
    return res.status(200).json({
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    });
  }

  const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connStr) return res.status(503).json({ error: 'No DB URL' });

  const sql = neon(connStr);

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT value FROM mld_store WHERE key = 'mld_scanned'`;
      return res.status(200).json(rows[0] ? JSON.parse(rows[0].value) : {});
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (typeof body !== 'object') return res.status(400).json({ error: 'bad body' });
      const val = JSON.stringify(body);
      await sql`
        INSERT INTO mld_store (key, value) VALUES ('mld_scanned', ${val})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).end();
}
