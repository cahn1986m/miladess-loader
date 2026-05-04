import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.POSTGRES_URL);

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
      const val = JSON.stringify(req.body);
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
