# IOTMOOC – MCQ Practice

React + Vite + Tailwind frontend, Express API (as a Vercel serverless function), MongoDB Atlas via Mongoose. JavaScript only.

## Structure
```
api/index.js          Vercel serverless entry (exports the Express app)
server/               Express app, routes, Mongoose models, cached DB connection
lib/                  Pure logic: ordering/selection, answer checking, scoring, bank validation
scripts/import.js     Imports assignments + questions into MongoDB
data/assignments.json 15 assignment slots (title/description)
data/questions/       assignment-1.json … assignment-8.json (your supplied questions)
src/                  React app (pages, components, hooks, api.js)
tests/                node:test unit tests (npm test)
vercel.json           Rewrites /api/* -> function, SPA fallback
```

## Local setup
1. `npm install`
2. `cp .env.example .env` and set `MONGODB_URI` (Atlas → Connect → Drivers). Allow your IP in Atlas Network Access.
3. `npm run import` – loads the 15 assignment slots and the 120 questions (creates indexes).
4. `npm run dev:all` – web on http://localhost:5173, API on :5000 (Vite proxies `/api`).
5. `npm test` / `npm run build`.

## Adding the next 10 assignments
1. Create `data/questions/assignment-6.json` (… up to 15) as an array:
```json
{
  "questionId": "assignment-6-q01",
  "assignmentId": "assignment-6",
  "questionNumber": 1,
  "questionText": "…",
  "options": [{ "key": "A", "text": "…" }, { "key": "B", "text": "…" }],
  "correctAnswers": ["B"],
  "explanation": "…"
}
```
   Use several keys in `correctAnswers` for multiple-correct questions; the UI shows a "Multiple Correct Answers" label and checkboxes automatically.
2. Do not set `type` yourself: it is derived from `correctAnswers` (1 answer = single, more = multiple). A mismatch or empty key is flagged and the import stops.
3. (Optional) edit the title/description in `data/assignments.json`.
4. Run `npm run import`. The import validates everything first, then the assignment turns from "Coming Soon" to "Available". No UI changes needed. Re-running is safe (upserts by `questionId`).

## Deploy to Vercel
1. Push this folder to GitHub and import it in Vercel (framework: Vite; settings come from `vercel.json`).
2. Add environment variable `MONGODB_URI` (Production + Preview). Do **not** prefix it with `VITE_`.
3. In Atlas → Network Access allow `0.0.0.0/0` (Vercel IPs are dynamic) and use a least-privilege DB user.
4. Run `npm run import` once from your machine (same `MONGODB_URI`) to load the data.
5. Deploy. Check `https://<your-app>.vercel.app/api/health` and `/api/assignments`.
`VITE_API_URL` is only needed if the API lives on a different origin.

## Notes
- Correct answers/explanations are only returned by `POST /api/attempts/:id/check` after a question is checked; question-listing endpoints never include them.
- Question order is chosen once on the server when the attempt starts and stored with the attempt.
- Rate limiting is in-memory per serverless instance (basic protection only).
- Full-length tests (60/120/180): selection logic, scoring and tests exist in `lib/`, but there are no routes or UI yet.
