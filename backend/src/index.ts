import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/skills', async (c) => {
  const query = c.req.query('q');
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
  const offset = Number(c.req.query('offset')) || 0;

  let sql = 'SELECT id, name, description, author, version, tags, quality_score, trust_score FROM skills';
  const params: any[] = [];

  if (query) {
    sql += ' WHERE name LIKE ? OR description LIKE ?';
    params.push(`%${query}%`, `%${query}%`);
  }

  sql += ' ORDER BY trust_score DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ data: results });
});

app.get('/api/skills/:id', async (c) => {
  const id = c.req.param('id');
  const skill = await c.env.DB.prepare('SELECT * FROM skills WHERE id = ?').bind(id).first();
  
  if (!skill) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  // Parse tags back to array if it's a string
  if (typeof skill.tags === 'string') {
    try {
      skill.tags = JSON.parse(skill.tags);
    } catch {
      skill.tags = [];
    }
  }

  return c.json(skill);
});

// For submitting new skills or updating existing ones (protected)
app.post('/api/skills', async (c) => {
  // Very basic auth for now, in a real system this would use JWTs or proper API keys
  const auth = c.req.header('Authorization');
  if (auth !== 'Bearer agentpm_admin_secret') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { id, name, description, author, version, content, tags } = body;

  if (!id || !name || !content) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const tagsString = JSON.stringify(tags || []);

  await c.env.DB.prepare(
    `INSERT INTO skills (id, name, description, author, version, content, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET 
      description = excluded.description,
      author = excluded.author,
      version = excluded.version,
      content = excluded.content,
      tags = excluded.tags,
      updated_at = CURRENT_TIMESTAMP`
  ).bind(id, name, description, author, version, content, tagsString).run();

  return c.json({ success: true, id });
});

export default app;
