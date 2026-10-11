# GymRAG frontend

Run `npm ci`, then `npm run dev` for the local Vite proxy. Run `npm test` and `npm run build` for verification.

Production requires `VITE_API_URL=https://your-backend.example.com` at build time, or `/api` when your host reverse-proxies the API. An existing `/api` suffix is also accepted. Bare hostnames are normalized to HTTPS; invalid schemes, query strings, and embedded credentials are rejected. Set the backend's `CORS_ORIGINS` to this frontend's origin. See [the project README](../README.md) for the full setup.
