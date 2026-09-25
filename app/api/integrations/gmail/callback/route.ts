import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { gmailConnections } from '@/db/schema';
import {
  exchangeAuthorizationCode,
  getGmailProfile,
  startGmailWatch,
} from '@/lib/gmail/client';
import { encryptSecret, verifyOAuthState } from '@/lib/gmail/security';
import { syncGmailForUser } from '@/lib/gmail/sync';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state)
    return Response.json(
      { error: 'Google no devolvió la autorización completa.' },
      { status: 400 },
    );
  try {
    const { userId } = await verifyOAuthState(state);
    const tokens = await exchangeAuthorizationCode(code);
    const db = getDb();
    const [existing] = await db
      .select()
      .from(gmailConnections)
      .where(eq(gmailConnections.userId, userId))
      .limit(1);
    const encryptedRefreshToken = tokens.refresh_token
      ? await encryptSecret(tokens.refresh_token)
      : existing?.encryptedRefreshToken;
    if (!encryptedRefreshToken)
      throw new Error(
        'Google no devolvió un refresh token. Revoca el acceso anterior y vuelve a conectar.',
      );
    const profile = await getGmailProfile(tokens.access_token);
    const watch = process.env.GMAIL_PUBSUB_TOPIC
      ? await startGmailWatch(tokens.access_token)
      : null;
    const stamp = new Date().toISOString();
    const historyId = watch?.historyId ?? profile.historyId;
    await db
      .insert(gmailConnections)
      .values({
        userId,
        email: profile.emailAddress,
        encryptedRefreshToken,
        historyId,
        status: 'connected',
        createdAt: stamp,
        updatedAt: stamp,
      })
      .onConflictDoUpdate({
        target: gmailConnections.userId,
        set: {
          email: profile.emailAddress,
          encryptedRefreshToken,
          historyId,
          status: 'connected',
          updatedAt: stamp,
        },
      });
    let imported = 0;
    try {
      imported = (await syncGmailForUser(userId)).created;
    } catch {
      // The connection remains valid; a later manual or push sync can retry.
    }
    return Response.redirect(
      new URL(`/?gmail=connected&imported=${imported}`, url.origin),
      302,
    );
  } catch (error) {
    const message = encodeURIComponent(
      error instanceof Error ? error.message : 'No se pudo conectar Gmail.',
    );
    return Response.redirect(
      new URL(`/?gmail=error&message=${message}`, url.origin),
      302,
    );
  }
}
