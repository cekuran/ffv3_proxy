# family finances proxy

Cloudflare Worker (`src/index.ts` vía `wrangler`). Envuelve `doGet`/`doPost` del **backend** para evitar el límite de CORS de Apps Script, agrega caché y normaliza headers.

El **frontend** habla con este Worker, nunca con el backend directo. La URL del Worker es la que va en `API_URL` (reescrita por **tools** en cada deploy).

## Repos relacionados

| Repo | Relación | URL |
|------|----------|-----|
| family finances backend | Es el origen. El Worker reenvía todas las requests al `exec` URL del Apps Script | https://github.com/cekuran/ffv3_backend |
| family finances frontend | Habla contra la URL de este Worker, no contra el backend | https://github.com/cekuran/ffv3_frontend |
| family finances tools | Lo despliega con `wrangler deploy` y guarda la URL en `API_URL` | https://github.com/cekuran/ffv3_tools |

Flujo: `Index.html → Worker (este repo) → Apps Script doGet/doPost → Sheets`.

## Setup inicial

Requisitos: Node 18+, `wrangler` (`npm i -g wrangler`), cuenta Cloudflare.

```bash
git clone git@github.com:cekuran/ffv3_proxy.git
cd ffv3_proxy
npm install
wrangler login
```

## Configuración básica

1. **`wrangler.toml`**: define el `name` del Worker y el `compatibility_date`. Para producción, agregar `routes` o custom domain.
2. **Variable de entorno con la URL del backend**: el Worker lee la URL del `exec` de Apps Script desde una variable o secret. Configurar con:
   ```bash
   wrangler secret put APPS_SCRIPT_URL
   ```
   Pegar la URL del tipo `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`.
3. **`src/index.ts`**: punto de entrada del Worker. Mantiene la lógica de reenvío, headers y caché.

## Despliegue

Manual:

```bash
wrangler deploy
```

Orquestado: **family finances tools** corre `wrangler deploy` y captura la URL resultante para reescribir `API_URL` en el frontend.

## Estructura

```
proxy/
├── src/                  # código del Worker
├── wrangler.toml         # config de Cloudflare
├── package.json
├── package-lock.json
└── .wrangler/            # estado local de wrangler (ignorar)
```