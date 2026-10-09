// ponytail: pass-through CORS proxy. Deja que `fetch` siga los redirects de
// Apps Script (/exec → script.googleusercontent.com) de forma nativa — son
// idempotentes una vez calculada la respuesta, así que no reintentamos manualmente.
// El cap real es el wall-clock de Cloudflare (30s free, configurable en planes
// de pago); el frontend reintenta cold-starts de acciones idempotentes con backoff.
// Para que el navegador reciba un 504 con CORS (y no un error de red opaco),
// el proxy corta él mismo antes de ese límite.
const UPSTREAM_TIMEOUT_MS = 27000;
const DEFAULT_TARGET = 'https://script.google.com/macros/s/AKfycby5G9NL81H7NUhrU37B4Zc2C3yaAJLUFdQ5xMLdNR5XZhGfgfw3sBZmvusUueXvPSTKhw/exec';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const target = (env && env.TARGET) || DEFAULT_TARGET;
    // Apps Script valida el Host: reescribir el que arrastra el navegador
    // (cloudflare.com) al del Web App de destino.
    const headers = new Headers();
    const ct = request.headers.get('Content-Type');
    if (ct) headers.set('Content-Type', ct);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const init = { method: request.method, headers, redirect: 'manual', signal: ctrl.signal };
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.text();
      }
      let upstream = await fetch(target, init);
      // Apps Script responde 302 → URL con el resultado; se sigue con GET.
      for (let i = 0; i < 5 && upstream.status >= 300 && upstream.status < 400; i++) {
        const loc = upstream.headers.get('Location');
        if (!loc) break;
        upstream = await fetch(new URL(loc, target).toString(), { method: 'GET', redirect: 'manual', signal: ctrl.signal });
      }
      clearTimeout(timer);
      const out = new Response(upstream.body, upstream);
      for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
      return out;
    } catch (err) {
      clearTimeout(timer);
      if (ctrl.signal.aborted) {
        return new Response('Upstream timeout (cold-start)', { status: 504, headers: CORS });
      }
      return new Response(`Proxy error: ${err.message}`, {
        status: 502,
        headers: CORS,
      });
    }
  },
};
