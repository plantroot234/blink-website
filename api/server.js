const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db  = new Database(path.join(__dirname, 'blink.db'));

// ── schema ──
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    artist       TEXT    NOT NULL,
    url          TEXT    NOT NULL,
    votes        INTEGER DEFAULT 0,
    status       TEXT    DEFAULT 'pending',
    submitted_at TEXT    DEFAULT (datetime('now')),
    approved_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS votes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    ip            TEXT    NOT NULL,
    voted_at      TEXT    DEFAULT (datetime('now')),
    UNIQUE(submission_id, ip)
  );
`);

const THRESHOLD = 5;

app.use(express.json());

// ── GET /api/pending ──
app.get('/api/pending', (req, res) => {
  const rows = db.prepare(
    "SELECT id, title, artist, votes FROM submissions WHERE status = 'pending' ORDER BY votes DESC, submitted_at DESC"
  ).all();
  res.json(rows);
});

// ── GET /api/approved ──
app.get('/api/approved', (req, res) => {
  const rows = db.prepare(
    "SELECT id, title, artist, url FROM submissions WHERE status = 'approved' ORDER BY approved_at DESC"
  ).all();
  res.json(rows);
});

// ── POST /api/submit ──
app.post('/api/submit', (req, res) => {
  const { title, artist, url } = req.body || {};

  if (!title?.trim() || !artist?.trim() || !url?.trim())
    return res.status(400).json({ error: 'title, artist, and url are required' });

  if (title.length > 100 || artist.length > 100 || url.length > 500)
    return res.status(400).json({ error: 'input too long' });

  if (!/^https?:\/\//.test(url))
    return res.status(400).json({ error: 'url must start with http(s)://' });

  // rate limit: 3 submissions per IP per hour
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  const recent = db.prepare(
    "SELECT COUNT(*) as c FROM submissions WHERE ip = ? AND submitted_at > datetime('now', '-1 hour')"
  ).get(ip);

  // add ip column if not there yet (safe)
  try {
    db.exec("ALTER TABLE submissions ADD COLUMN ip TEXT");
  } catch (_) {}

  if (recent && recent.c >= 3)
    return res.status(429).json({ error: 'slow down, max 3 submissions per hour' });

  try {
    db.prepare("INSERT INTO submissions (title, artist, url, ip) VALUES (?, ?, ?, ?)")
      .run(title.trim(), artist.trim(), url.trim(), ip);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'could not save submission' });
  }
});

// ── POST /api/vote/:id ──
app.post('/api/vote/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();

  const sub = db.prepare("SELECT * FROM submissions WHERE id = ? AND status = 'pending'").get(id);
  if (!sub) return res.status(404).json({ error: 'not found' });

  try {
    db.prepare("INSERT INTO votes (submission_id, ip) VALUES (?, ?)").run(id, ip);
  } catch (_) {
    return res.status(400).json({ error: 'already voted' });
  }

  db.prepare("UPDATE submissions SET votes = votes + 1 WHERE id = ?").run(id);
  const updated = db.prepare("SELECT votes FROM submissions WHERE id = ?").get(id);

  if (updated.votes >= THRESHOLD) {
    db.prepare("UPDATE submissions SET status = 'approved', approved_at = datetime('now') WHERE id = ?").run(id);
    return res.json({ ok: true, votes: updated.votes, approved: true });
  }

  res.json({ ok: true, votes: updated.votes, approved: false });
});

app.listen(4200, '127.0.0.1', () => {
  console.log('blink api on :4200');
});
