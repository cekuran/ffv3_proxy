# tasktime-cors-proxy

Cloudflare Worker (`src/index.js`) que reenvía las llamadas `fetch()` del navegador al WebApp de Google Apps Script de TaskTime. Añade cabeceras CORS permisivas para que el frontend estático, servido desde cualquier origen, pueda hacer `POST` contra `doPost`, que Apps Script no permite entre orígenes.

```
frontend → Worker (Cloudflare) → Apps Script WebApp (/exec) → Google Sheets
```

## Comportamiento

- `OPTIONS` → responde `204` con las cabeceras CORS (preflight).
- `GET` / `POST` → reenvía al `TARGET`, conservando solo `Content-Type`. Apps Script valida el `Host`, así que no se arrastran las cabeceras del navegador.
- Redirects: Apps Script responde `302` (`/exec` → `script.googleusercontent.com`). El Worker los sigue manualmente con `GET` (hasta 5 saltos).
- Toda respuesta lleva CORS (`Access-Control-Allow-Origin: *`, métodos `GET,POST,OPTIONS`).
- Error de red/upstream → `502` con `Proxy error: <mensaje>`.
- El tope real es el wall-clock de Cloudflare (30 s en plan gratuito). Durante un cold-start de Apps Script puede aparecer un `504`; el frontend reintenta con espera.

## Configuración

[wrangler.toml](wrangler.toml):

| Clave | Valor |
|-------|-------|
| `name` | `tasktime-cors-proxy` |
| `main` | `src/index.js` |
| `[vars].TARGET` | URL `/exec` del deployment de Apps Script |
| `[dev].port` | `8787` |

`TARGET` se puede sobrescribir por entorno:

```bash
npx wrangler dev --var TARGET:https://script.google.com/macros/s/<ID>/exec
npx wrangler deploy --var TARGET:https://script.google.com/macros/s/<ID>/exec
```

Si `TARGET` no está definido, se usa `DEFAULT_TARGET` de `src/index.js`. Cuando cambie el `DeploymentId` de Apps Script, actualizar ambos.

## Desarrollo local

```bash
cd proxy
npm install
npm run dev          # http://127.0.0.1:8787
```

Apuntar `API_URL` de [../frontend/index.html](../frontend/index.html) a `http://127.0.0.1:8787`. La opción 8 de [../tools/Set-ApiDeployment.ps1](../tools/Set-ApiDeployment.ps1) arranca el Worker local y puede reescribir `API_URL` automáticamente.

## Despliegue

Requiere sesión de Wrangler (`npx wrangler login`).

```bash
cd proxy
npm run deploy
```

O con el script orquestado, opción 5 de `pwsh ./tools/Set-ApiDeployment.ps1`: despliega, guarda la URL en `[cloudflare]` de [../release_info.txt](../release_info.txt) y ofrece actualizar `API_URL` en el frontend.

## Estructura

```
proxy/
├── src/index.js      # Worker
├── wrangler.toml     # nombre, TARGET, puerto de dev
├── package.json      # scripts dev/deploy, wrangler ^4
└── .gitignore
```
