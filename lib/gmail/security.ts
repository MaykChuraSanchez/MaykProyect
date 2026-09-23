const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function encryptSecret(value: string) {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value));
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  const [encodedIv, encodedCipher] = value.split('.');
  if (!encodedIv || !encodedCipher) throw new Error('Token cifrado inválido.');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(encodedIv) }, await encryptionKey(), fromBase64Url(encodedCipher));
  return decoder.decode(decrypted);
}

export async function signOAuthState(userId: string) {
  const payload = toBase64Url(encoder.encode(JSON.stringify({ userId, nonce: crypto.randomUUID(), exp: Date.now() + 10 * 60_000 })));
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

export async function verifyOAuthState(state: string) {
  const [payload, signature] = state.split('.');
  if (!payload || !signature || !(await timingSafeEqual(signature, await hmac(payload)))) throw new Error('Estado OAuth inválido.');
  const decoded = JSON.parse(decoder.decode(fromBase64Url(payload))) as { userId: string; exp: number };
  if (!decoded.userId || decoded.exp < Date.now()) throw new Error('La autorización OAuth expiró.');
  return decoded;
}

async function encryptionKey() {
  const raw = fromBase64Url(required('TOKEN_ENCRYPTION_KEY'));
  if (raw.byteLength !== 32) throw new Error('TOKEN_ENCRYPTION_KEY debe contener exactamente 32 bytes en Base64URL.');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(required('GMAIL_STATE_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

async function timingSafeEqual(a: string, b: string) {
  const left = encoder.encode(a); const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let result = 0; for (let i = 0; i < left.length; i += 1) result |= left[i] ^ right[i];
  return result === 0;
}

function toBase64Url(value: Uint8Array) {
  let binary = ''; value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function required(name: string) {
  const value = process.env[name]; if (!value) throw new Error(`Falta la variable de entorno ${name}.`); return value;
}
