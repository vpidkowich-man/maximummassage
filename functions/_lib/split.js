// Edge splitter for the Flow A / Flow B A/B test.
//
// Adjust this single number to control the split. 0 = 100% Flow A (control
// only). 50 = 50/50. 80 means 80% Flow B / 20% Flow A. Range: 0..100.
const FLOW_B_PERCENTAGE = 0;

const COOKIE_NAME = 'mh_flow';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const FLOW_A_PATH = '/massage-therapy-calgary-flow-a/';
const FLOW_B_PATH = '/massage-therapy-calgary-flow-b/';

export async function splitRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const cookies = parseCookies(request.headers.get('Cookie') || '');
  let bucket = cookies[COOKIE_NAME];

  if (bucket !== 'a' && bucket !== 'b') {
    bucket = await assignBucket(request);
  }

  const targetPath = bucket === 'b' ? FLOW_B_PATH : FLOW_A_PATH;
  const rewriteUrl = new URL(url);
  rewriteUrl.pathname = targetPath;

  const rewritten = new Request(rewriteUrl.toString(), request);
  const upstream = await env.ASSETS.fetch(rewritten);

  const response = new Response(upstream.body, upstream);
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${bucket}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax; Secure`
  );
  return response;
}

async function assignBucket(request) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const seed = ip + '|' + ua;

  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const bytes = new Uint8Array(buf);
  const slot = ((bytes[0] << 8) | bytes[1]) % 100;
  return slot < FLOW_B_PERCENTAGE ? 'b' : 'a';
}

function parseCookies(header) {
  const out = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx < 0) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = v;
  });
  return out;
}
