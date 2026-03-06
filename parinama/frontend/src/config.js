/* ════════════════════════════════════════════════
   PARINAMA — API Configuration
   Centralized API/WebSocket URL resolution
   ════════════════════════════════════════════════ */

/* 
  In development: Vite proxy handles /api and /ws → localhost:8000
  In production:  Connect directly to backend URL
*/

const isDev = import.meta.env.DEV;

/* Backend URL — set via env var or auto-detect */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
  || (isDev ? '' : '');

/* 
  In production: frontend is served from the same FastAPI server,
  so we use same-origin (empty string) for all API/WS calls.
*/

/* API base (HTTP) */
export const API_BASE = `${BACKEND_URL}/api`;

/* WebSocket base */
const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsHost = BACKEND_URL
  ? BACKEND_URL.replace(/^https?:\/\//, '')
  : (typeof window !== 'undefined' ? window.location.host : 'localhost:5173');

export const WS_URL = `${wsProtocol}://${wsHost}/ws/evolve`;

export default { API_BASE, WS_URL };
