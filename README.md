# Pessiai

A Node.js + Express website with a public prompt/drawing request page and a password-protected `/ai` studio. Studio operators manually write replies or draw on a canvas; visitors retrieve replies using a request code.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Set a strong `ADMIN_PASSWORD` and a long random `SESSION_SECRET`.
4. Run:

```bash
npm install
npm start
```

Open `http://localhost:3000`. The public page is `/` and the private studio is `/ai`.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. In Render, choose **New → Blueprint** and select the repository (or create a Node web service using `npm install` and `npm start`).
3. The included `render.yaml` creates a persistent disk mounted at `/var/data` and generates `ADMIN_PASSWORD` and `SESSION_SECRET`.
4. After deployment, open `https://YOUR-SERVICE.onrender.com/ai`. Find the generated `ADMIN_PASSWORD` in the Render service's Environment settings.

If you create the service manually, add `NODE_ENV=production`, `DATA_DIR=/var/data`, a strong `ADMIN_PASSWORD`, and a long random `SESSION_SECRET`, and attach a persistent disk mounted at `/var/data`. Without a persistent disk, saved requests and sessions may be lost when the service restarts or redeploys.

## Notes

- Keep the studio password private. Do not put it in frontend JavaScript or commit `.env`.
- The public page does not claim that responses are generated automatically.
- This starter stores requests in a JSON file and sessions in SQLite on the persistent disk. For a large public service, move request storage to a managed database and add moderation, privacy/retention controls, and stronger operational monitoring.
- Add your own privacy notice and contact information before opening the site to the public.
