const DEFAULT_TARGET = 'https://script.google.com/macros/s/AKfycbwn-PA9kxM6ZocrXL7T0wGb8UhP8fqiHJ_9235QCDzyRkiV5Ihz6VmLmC51go3JBSyv/exec';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// ponytail: Apps Script cold start (1ª llamada tras deploy) puede tardar 30-60s.
// El plan gratuito de CF mata workers a los 30s wall-clock, así que el cap
// efectivo es ~28s. El env var UPSTREAM_TIMEOUT_MS permite subirlo en planes
// de pago (Bundled/Unbound) donde el límite wall-clock se eleva.
const UPSTREAM_TIMEOUT_MS = Number((env && env.UPSTREAM_TIMEOUT_MS) || 28000);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const target = (env && env.TARGET) || DEFAULT_TARGET;
    const headers = new Headers(request.headers);
    headers.set('Host', new URL(target).host);

    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try { body = await request.text(); } catch (e) { body = ''; }
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const init = { method: request.method, headers, signal: ac.signal };
      if (body != null) init.body = body;
      const upstream = await fetch(target, init);
      const out = new Response(upstream.body, upstream);
      for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
      return out;
    } catch (err) {
      const isAbort = err && (err.name === 'AbortError' || /aborted/i.test(String(err.message || '')));
      const status = isAbort ? 504 : 502;
      const msg = isAbort ? `Upstream timeout after ${UPSTREAM_TIMEOUT_MS}ms` : `Proxy error: ${err.message}`;
      return new Response(msg, { status, headers: CORS });
    } finally {
      clearTimeout(timer);
    }
  },
};
