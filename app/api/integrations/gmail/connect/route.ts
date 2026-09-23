import { gmailAuthorizationUrl } from '@/lib/gmail/client';
import { signOAuthState } from '@/lib/gmail/security';
import { getRequestUserId } from '@/lib/server-finance';

export async function GET(request: Request) {
  const userId = getRequestUserId(request);
  if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  return Response.redirect(gmailAuthorizationUrl(await signOAuthState(userId)), 302);
}
