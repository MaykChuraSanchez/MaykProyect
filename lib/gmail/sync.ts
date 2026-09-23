import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { gmailConnections, ingestionEvents, movements } from '@/db/schema';
import { getTransactionalEmail, listTransactionalMessageIds, refreshGmailAccessToken } from '@/lib/gmail/client';
import { decryptSecret } from '@/lib/gmail/security';
import { parsePeruvianBankEmail } from '@/lib/ingestion/peruvian-bank-email';

export async function syncGmailForUser(userId: string) {
  const db = getDb();
  const [connection] = await db.select().from(gmailConnections).where(eq(gmailConnections.userId, userId)).limit(1);
  if (!connection || connection.status !== 'connected') throw new Error('Gmail no está conectado.');

  const refreshToken = await decryptSecret(connection.encryptedRefreshToken);
  const { access_token: accessToken } = await refreshGmailAccessToken(refreshToken);
  const after = connection.lastSyncAt ? Math.floor(new Date(connection.lastSyncAt).getTime() / 1000) - 3600 : undefined;
  const messageIds = await listTransactionalMessageIds(accessToken, after);
  let created = 0; let ignored = 0; let failed = 0;

  for (const messageId of messageIds) {
    const [seen] = await db.select({ id: ingestionEvents.id }).from(ingestionEvents)
      .where(and(eq(ingestionEvents.userId, userId), eq(ingestionEvents.provider, 'gmail'), eq(ingestionEvents.externalId, messageId))).limit(1);
    if (seen) { ignored += 1; continue; }
    const stamp = new Date().toISOString();
    try {
      const email = await getTransactionalEmail(accessToken, messageId);
      const draft = await parsePeruvianBankEmail(email);
      if (!draft) {
        await db.insert(ingestionEvents).values({ userId, provider: 'gmail', externalId: messageId, fingerprint: `ignored:${messageId}`, status: 'ignored', rawSubject: email.subject.slice(0, 240), createdAt: stamp, updatedAt: stamp });
        ignored += 1; continue;
      }
      const [movement] = await db.insert(movements).values({
        userId, type: draft.type, amount: draft.amount, description: draft.description, merchant: draft.merchant ?? '',
        category: draft.category, subcategory: '', paymentMethod: draft.paymentMethod, accountId: null, destinationAccountId: null, cardId: null,
        installments: 1, scope: 'Personal', status: 'Por revisar', source: `Gmail · ${draft.bank}`, movementDate: draft.movementDate,
        excludeBudget: draft.type === 'Transferencia', reviewed: false,
        tags: JSON.stringify(['gmail', draft.bank.toLowerCase(), draft.currency.toLowerCase(), `confianza:${draft.confidence}`]),
        attachmentCount: 0, createdAt: stamp, updatedAt: stamp,
      }).returning();
      await db.insert(ingestionEvents).values({ userId, provider: 'gmail', externalId: messageId, fingerprint: draft.fingerprint, status: 'created', rawSubject: email.subject.slice(0, 240), movementId: movement.id, createdAt: stamp, updatedAt: stamp });
      created += 1;
    } catch (error) {
      failed += 1;
      try {
        await db.insert(ingestionEvents).values({ userId, provider: 'gmail', externalId: messageId, fingerprint: `failed:${messageId}`, status: 'failed', rawSubject: '', error: error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido', createdAt: stamp, updatedAt: stamp });
      } catch { /* A concurrent worker may have claimed the message first. */ }
    }
  }

  const syncedAt = new Date().toISOString();
  await db.update(gmailConnections).set({ lastSyncAt: syncedAt, updatedAt: syncedAt }).where(eq(gmailConnections.userId, userId));
  return { created, ignored, failed, scanned: messageIds.length, syncedAt };
}
