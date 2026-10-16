// Vercel serverless entry point. vercel.json rewrites /api/* to this function.
// An Express app is a valid (req, res) handler, so we export it directly.
import app from '../server/app.js';

export default app;
