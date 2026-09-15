import axios from 'axios';

const api = axios.create({
  // In development, this is empty (so it uses Vite's local proxy).
  // In production (Vercel), it points directly to your live Render backend.
  baseURL: "https://carecase-ai-j4wy.onrender.com",
});

export default api;