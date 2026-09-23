type JwtPayload = { aud?: string | string[]; email?: string; email_verified?: boolean; exp?: number; iss?: string };

export async function verifyPubSubOidc(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSignature) return false;
  const header = JSON.parse(decodeText(encodedHeader)) as { alg?: string; kid?: string };
  if (header.alg !== 'RS256' || !header.kid) return false;
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', { cache: 'force-cache' });
  if (!response.ok) return false;
  const jwks = await response.json() as { keys?: Array<JsonWebKey & { kid?: string; alg?: string }> };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.alg === 'RS256');
  if (!jwk) return false;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const validSignature = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBytes(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));
  if (!validSignature) return false;
  const payload = JSON.parse(decodeText(encodedPayload)) as JwtPayload;
  const audience = process.env.PUBSUB_AUDIENCE; const serviceAccount = process.env.PUBSUB_SERVICE_ACCOUNT_EMAIL;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  return Boolean(audience && serviceAccount && audiences.includes(audience) && payload.email === serviceAccount && payload.email_verified !== false && (payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com') && (payload.exp ?? 0) * 1000 > Date.now());
}

function decodeText(value: string) { return new TextDecoder().decode(decodeBytes(value)); }
function decodeBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
