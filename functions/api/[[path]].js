// Cloudflare Pages Functions API Gateway for VoidFlix Hentai
// Handles Warden token generation, header spoofing (User-Agent), search normalization, and CORS.

const API_BASE = 'https://api.hentaihaven.app/v1';

const DEVICE_BODY = new URLSearchParams({
  sdkInt: '33',
  board: 'goldfish_x86_64',
  brand: 'google',
  display: 'sdk_gphone_x86_64-userdebug 13 TE1A.220922.028 10190541 dev-keys',
  fingerprint: 'google/sdk_gphone_x86_64/emu64xa:13/TE1A.220922.028/10190541:userdebug/dev-keys',
  manufacturer: 'Google',
  model: 'sdk_gphone_x86_64'
}).toString();

let cachedToken = null;
let tokenExpiresAt = 0;

async function fetchWardenToken(force = false) {
  const now = Math.floor(Date.now() / 1000);
  if (!force && cachedToken && now < tokenExpiresAt - 60) {
    return cachedToken;
  }

  const res = await fetch(`${API_BASE}/warden`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'User-Agent': 'HH_xxx_APP',
      'Accept': 'application/json'
    },
    body: DEVICE_BODY
  });

  if (!res.ok) {
    throw new Error(`Warden request failed with status ${res.status}`);
  }

  const data = await res.json();
  if (data?.data?.token) {
    cachedToken = data.data.token;
    tokenExpiresAt = data.data.expiration || (now + 3600);
    return cachedToken;
  }
  throw new Error(data?.data || 'Failed to parse warden token');
}

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const pathSegments = params.path || [];
  const subPath = Array.isArray(pathSegments) ? pathSegments.join('/') : (pathSegments || '');

  // Root /api info
  if (!subPath || subPath === '/') {
    return new Response(JSON.stringify({ status: 'ok', name: 'VoidFlix Cloudflare API Gateway' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Health check
  if (subPath === 'health' || subPath === 'health/') {
    try {
      const token = await fetchWardenToken();
      return new Response(JSON.stringify({ status: 'ok', connected: true, hasToken: !!token }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (err) {
      return new Response(JSON.stringify({ status: 'error', message: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // Warden token
  if (subPath === 'warden' || subPath === 'warden/') {
    try {
      const token = await fetchWardenToken(true);
      return new Response(JSON.stringify({ success: true, data: { token, expiration: tokenExpiresAt } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // General Proxy
  try {
    let token = request.headers.get('warden') || await fetchWardenToken();
    const targetUrl = `${API_BASE}/${subPath}${url.search}`;

    const outgoingHeaders = new Headers();
    outgoingHeaders.set('User-Agent', 'HH_xxx_APP');
    outgoingHeaders.set('warden', token);
    outgoingHeaders.set('Accept', 'application/json');

    const incomingContentType = request.headers.get('Content-Type');
    if (incomingContentType) {
      outgoingHeaders.set('Content-Type', incomingContentType);
    }

    let upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers: outgoingHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
    });

    // Check token expiration
    if (upstreamRes.status === 401 || upstreamRes.status === 403) {
      const newToken = await fetchWardenToken(true);
      outgoingHeaders.set('warden', newToken);
      upstreamRes = await fetch(targetUrl, {
        method: request.method,
        headers: outgoingHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
      });
    }

    // Normalization for search queries with 0 results
    if (subPath.startsWith('search')) {
      const text = await upstreamRes.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed && (parsed.data === 'No results found' || parsed.data === 'Enter a search')) {
          parsed.success = true;
          parsed.data = [];
          return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      } catch (e) {}
      return new Response(text, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
          ...corsHeaders
        }
      });
    }

    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    if (request.method === 'GET' && upstreamRes.status === 200) {
      responseHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400');
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gateway Error: ' + err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
