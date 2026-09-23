import type { BankEmailInput } from '@/lib/ingestion/peruvian-bank-email';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

export function gmailAuthorizationUrl(state: string) {
  const params = new URLSearchParams({
    client_id: required('GOOGLE_CLIENT_ID'), redirect_uri: required('GOOGLE_REDIRECT_URI'),
    response_type: 'code', scope: GMAIL_SCOPE, access_type: 'offline', include_granted_scopes: 'true',
    prompt: 'consent', state,
  });
  return `${AUTH_URL}?${params}`;
}

export async function exchangeAuthorizationCode(code: string) {
  return tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: required('GOOGLE_REDIRECT_URI') });
}

export async function refreshGmailAccessToken(refreshToken: string) {
  return tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' });
}

async function tokenRequest(values: Record<string, string>) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...values, client_id: required('GOOGLE_CLIENT_ID'), client_secret: required('GOOGLE_CLIENT_SECRET') }),
  });
  const payload = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description ?? 'Google no devolvió un token de acceso.');
  return payload as { access_token: string; refresh_token?: string; expires_in?: number };
}

export async function listTransactionalMessageIds(accessToken: string, afterEpochSeconds?: number) {
  const senders = ['notificaciones@notificacionesbcp.com.pe', 'servicioalcliente@netinterbank.com.pe'];
  const query = `(${senders.map((sender) => `from:${sender}`).join(' OR ')})${afterEpochSeconds ? ` after:${afterEpochSeconds}` : ''}`;
  const response = await gmailFetch(`${API_URL}/messages?${new URLSearchParams({ q: query, maxResults: '100' })}`, accessToken);
  const payload = await response.json() as { messages?: Array<{ id: string }> };
  return payload.messages?.map(({ id }) => id) ?? [];
}

export async function getGmailProfile(accessToken: string) {
  const response = await gmailFetch(`${API_URL}/profile`, accessToken);
  return response.json() as Promise<{ emailAddress: string; historyId: string }>;
}

export async function startGmailWatch(accessToken: string) {
  const topicName = required('GMAIL_PUBSUB_TOPIC');
  const response = await fetch(`${API_URL}/watch`, {
    method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicName, labelIds: ['INBOX'], labelFilterBehavior: 'include' }),
  });
  const payload = await response.json() as { historyId?: string; expiration?: string; error?: { message?: string } };
  if (!response.ok || !payload.historyId) throw new Error(payload.error?.message ?? 'No se pudo activar Gmail push.');
  return payload as { historyId: string; expiration?: string };
}

export async function getTransactionalEmail(accessToken: string, messageId: string): Promise<BankEmailInput> {
  const response = await gmailFetch(`${API_URL}/messages/${encodeURIComponent(messageId)}?format=full`, accessToken);
  const message = await response.json() as GmailMessage;
  const headers = new Map((message.payload?.headers ?? []).map(({ name, value }) => [name.toLowerCase(), value]));
  return {
    gmailMessageId: message.id,
    from: headers.get('from') ?? '', subject: headers.get('subject') ?? '', date: headers.get('date'),
    sentBy: authenticatedSender(headers), text: collectText(message.payload),
  };
}

async function gmailFetch(url: string, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Gmail API respondió ${response.status}.`);
  return response;
}

function authenticatedSender(headers: Map<string, string>) {
  const direct = headers.get('sender') ?? headers.get('return-path');
  if (direct) return direct;
  const auth = headers.get('authentication-results') ?? '';
  return auth.match(/(?:spf|dkim)=pass[^;]*(?:smtp\.mailfrom|header\.d)=([^;\s]+)/i)?.[1];
}

function collectText(part?: GmailPart): string {
  if (!part) return '';
  const own = part.body?.data ? decodeBase64Url(part.body.data) : '';
  const children = (part.parts ?? []).filter((child) => child.mimeType === 'text/plain' || child.mimeType?.startsWith('multipart/')).map(collectText).join('\n');
  return `${own}\n${children}`.trim();
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

type GmailPart = { mimeType?: string; headers?: Array<{ name: string; value: string }>; body?: { data?: string }; parts?: GmailPart[] };
type GmailMessage = { id: string; payload?: GmailPart };
