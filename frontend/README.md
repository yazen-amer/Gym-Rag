# GymRAG frontend

Run `npm ci`, then `npm run dev` for the local Vite proxy. Run `npm test` and `npm run build` for verification.

Production requires `VITE_API_URL=https://your-backend.example.com/api` at build time. Set the backend's `CORS_ORIGINS` to this frontend's origin. See [the project README](../README.md) for the full setup.
