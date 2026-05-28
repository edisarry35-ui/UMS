# Deployment Guide

## Frontend — Vercel

1. Deploy the `frontend` folder as a Vercel project.
2. Set the project root to `frontend`.
3. Ensure these build settings are used:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add the following environment variable in Vercel:
   - `VITE_API_URL=https://<your-backend-app>.onrender.com`
5. If you use a custom domain, set `VERCEL_URL` automatically via Vercel.

The frontend already includes `frontend/vercel.json` to handle client-side routing for React.

## Backend — Render

1. Deploy the repository or `backend` folder to Render.
2. If you use the `render.yaml` manifest, Render will detect the `backend` root automatically.
3. Verify the service is configured as a Node web service with:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add these environment variables in Render:
   - `MONGO_URI` — your MongoDB connection string
   - `JWT_SECRET` — a secure random secret for authentication
   - `FRONTEND_URL` — your Vercel frontend URL, e.g. `https://your-app.vercel.app`
   - `NODE_ENV=production`

## Notes

- The backend serves uploads from `/uploads` and exposes a health check at `/api/health`.
- The frontend `axios` client reads the backend URL from `VITE_API_URL`, so the deployed frontend will connect to Render when configured.
- Keep secrets out of version control and set them in the deployment platform.
