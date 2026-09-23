import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { gmailConnections } from '@/db/schema';
import { verifyPubSubOidc } from '@/lib/gmail/pubsub-auth';
import { syncGmailForUser } from '@/lib/gmail/sync';

type PubSubEnvelope = { message?: { data?: string; messageId?: string } };

export async function POST(request: Request) {
  if (!(await verifyPubSubOidc(request))) return Response.json({ error: 'Webhook no autorizado' }, { status: 401 });
  const envelope = await request.json() as PubSubEnvelope;
  if (!envelope.message?.data) return Response.json({ accepted: true });
  const notification = JSON.parse(decodeBase64(envelope.message.data)) as { emailAddress?: string; historyId?: string };
  if (!notification.emailAddress) return Response.json({ accepted: true });
  const [connection] = await getDb().select().from(gmailConnections).where(eq(gmailConnections.email, notification.emailAddress)).limit(1);
  if (!connection) return Response.json({ accepted: true });
  // Respond after processing in this portable implementation. In production, enqueue
  // the userId and acknowledge immediately so Pub/Sub can safely retry the worker.
  await syncGmailForUser(connection.userId);
  return Response.json({ accepted: true });
}

function decodeBase64(value: string) {
  const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
