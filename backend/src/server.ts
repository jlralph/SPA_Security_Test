import { setGlobalDispatcher, ProxyAgent } from 'undici';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { users, items, nextItemId } from './data';

if (process.env['HTTP_PROXY']) {
  setGlobalDispatcher(new ProxyAgent(process.env['HTTP_PROXY']));
}

const app = express();
const PORT = Number(process.env['PORT']) || 3000;
const JWT_SECRET = (() => {
  const s = process.env['JWT_SECRET'];
  if (!s) throw new Error('JWT_SECRET environment variable is required');
  return s;
})();

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// ── Auth middleware ─────────────────────────────────────────────────────────

interface JwtPayload { userId: number; username: string; role: string; }

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid token' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as unknown as JwtPayload;
    (req as Request & { user: JwtPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Token expired or invalid' });
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: JwtPayload }).user;
  if (user?.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────

app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { username, password } = req.body as { username?: string; password?: string };
  const found = users.find(u => u.username === username && u.password === password);
  if (!found) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }
  const token = jwt.sign(
    { userId: found.id, username: found.username, role: found.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const { password: _pw, ...safeUser } = found;
  res.json({ token, user: safeUser });
});

// ── GET /api/profile ─────────────────────────────────────────────────────────

app.get('/api/profile', requireAuth, (req: Request, res: Response): void => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const found = users.find(u => u.id === userId);
  if (!found) { res.status(404).json({ message: 'User not found' }); return; }
  const { password: _pw, ...safeUser } = found;
  res.json(safeUser);
});

// ── GET /api/users ────────────────────────────────────────────────────────────

app.get('/api/users', requireAuth, (_req: Request, res: Response): void => {
  res.json(users.map(({ password: _pw, ...u }) => u));
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────

app.get('/api/users/:id', requireAuth, (req: Request, res: Response): void => {
  const found = users.find(u => u.id === Number(req.params['id']));
  if (!found) { res.status(404).json({ message: 'Not found' }); return; }
  const { password: _pw, ...safeUser } = found;
  res.json(safeUser);
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────

app.delete('/api/users/:id', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const idx = users.findIndex(u => u.id === Number(req.params['id']));
  if (idx === -1) { res.status(404).json({ message: 'Not found' }); return; }
  users.splice(idx, 1);
  res.status(204).send();
});

// ── GET /api/items ────────────────────────────────────────────────────────────

app.get('/api/items', requireAuth, (_req: Request, res: Response): void => {
  res.json(items);
});

// ── GET /api/items/:id ────────────────────────────────────────────────────────

app.get('/api/items/:id', requireAuth, (req: Request, res: Response): void => {
  const found = items.find(i => i.id === Number(req.params['id']));
  if (!found) { res.status(404).json({ message: 'Not found' }); return; }
  res.json(found);
});

// ── POST /api/items ───────────────────────────────────────────────────────────

app.post('/api/items', requireAuth, (req: Request, res: Response): void => {
  const { name, description, price, category, inStock } = req.body as {
    name?: string; description?: string; price?: number; category?: string; inStock?: boolean;
  };
  if (!name || !category || price === undefined) {
    res.status(400).json({ message: 'name, category, and price are required' });
    return;
  }
  const item = { id: nextItemId(), name, description: description ?? '', price, category, inStock: inStock ?? true };
  items.push(item);
  res.status(201).json(item);
});

// ── DELETE /api/items/:id ─────────────────────────────────────────────────────

app.delete('/api/items/:id', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const idx = items.findIndex(i => i.id === Number(req.params['id']));
  if (idx === -1) { res.status(404).json({ message: 'Not found' }); return; }
  items.splice(idx, 1);
  res.status(204).send();
});

// ── GET /api/ssrf-test ────────────────────────────────────────────────────────
// Intentionally vulnerable endpoint for local OAST testing.
// Fetches a caller-supplied URL, triggering DNS + HTTP interactions on
// the oast-server when a *.oast.local payload is used.

app.get('/api/ssrf-test', async (req: Request, res: Response): Promise<void> => {
  const url = req.query['url'] as string | undefined;
  if (!url) {
    res.status(400).json({ error: 'url query parameter required' });
    return;
  }
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const text = await response.text();
    res.json({ status: response.status, body: text.slice(0, 500) });
  } catch (err: unknown) {
    res.json({ status: 'error', error: (err as Error).message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST   /api/auth/login');
  console.log('  GET    /api/profile      (auth)');
  console.log('  GET    /api/users        (auth)');
  console.log('  GET    /api/users/:id    (auth)');
  console.log('  DELETE /api/users/:id    (auth + admin)');
  console.log('  GET    /api/items        (auth)');
  console.log('  GET    /api/items/:id    (auth)');
  console.log('  POST   /api/items        (auth)');
  console.log('  DELETE /api/items/:id    (auth + admin)');
});
