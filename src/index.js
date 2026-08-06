const DEFAULT_TARGET = 'https://script.google.com/macros/s/AKfycbwn-PA9kxM6ZocrXL7T0wGb8UhP8fqiHJ_9235QCDzyRkiV5Ihz6VmLmC51go3JBSyv/exec';

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
    const headers = new Headers(request.headers);
    headers.set('Host', new URL(target).host);

    try {
      const init = { method: request.method, headers };
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = await request.text();
      }
      const upstream = await fetch(target, init);
      const out = new Response(upstream.body, upstream);
      for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
      return out;
    } catch (err) {
      return new Response(`Proxy error: ${err.message}`, {
        status: 502,
        headers: CORS,
      });
    }
  },
};