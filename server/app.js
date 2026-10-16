import express from 'express';
import rateLimit from 'express-rate-limit';
import router from './routes.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Vercel sits behind a proxy
app.use(express.json({ limit: '10kb' }));

// Best-effort rate limiting. NOTE: the counter is per serverless instance (in-memory),
// so this is a basic safeguard. Use Vercel Firewall / Upstash for strict global limits.
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' } }));

// Mounted at /api (normal) and at / (in case the platform strips the /api prefix after rewriting).
app.use('/api', router);
app.use('/', router);

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid identifier.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : err.message });
});

export default app;
