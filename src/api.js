// Thin fetch wrapper. VITE_API_URL is optional (leave empty when the API is on the same origin).
const BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  getAssignments: () => request('/assignments'),
  createAttempt: (assignmentId, order) => request('/attempts', { method: 'POST', body: { assignmentId, order } }),
  getAttempt: (id) => request(`/attempts/${id}`),
  checkAnswer: (id, questionId, selected) => request(`/attempts/${id}/check`, { method: 'POST', body: { questionId, selected } }),
  submitAttempt: (id) => request(`/attempts/${id}/submit`, { method: 'POST' }),
  // Random tests (no per-question checking; graded on the server at submit time)
  getTests: () => request('/tests'),
  createTest: (length) => request('/tests', { method: 'POST', body: { length } }),
  getTest: (id) => request(`/tests/${id}`),
  submitTest: (id, answers) => request(`/tests/${id}/submit`, { method: 'POST', body: { answers } }),
};