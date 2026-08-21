# tasktime-cors-proxy

Cloudflare Worker that forwards browser `fetch()` calls to the Google Apps
Script WebApp for [TaskTime](../). The Worker adds permissive CORS headers
so a static frontend served from any origin can call the Apps Script `doPost`
endpoint, which refuses cross-origin requests by default.

The target URL is read from the `[vars].TARGET` field in `wrangler.toml` and
overridden at deploy time by the deploy script (`tools/Set-ApiDeployment.ps1`).

```
browser → Worker → Apps Script WebApp (/exec) → Sheets
```

## Develop locally

```
npm install
npm run dev          # serves on http://127.0.0.1:8787
```

Point `frontend/index.html`'s `API_URL` at `http://127.0.0.1:8787` to test
end-to-end against the live Apps Script deployment. Use option 2 in the
deploy script to keep this in sync.

## Deploy

Run option 5 of [`../tools/Set-ApiDeployment.ps1`](../tools/Set-ApiDeployment.ps1),
or directly:

```
npm run deploy
```
