import { get, put } from '@vercel/blob';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { attachments, movements } from '@/db/schema';
import { getRequestUserId } from '@/lib/server-finance';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

export async function POST(request: Request) {
  const userId = getRequestUserId(request); if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  const form = await request.formData(); const file = form.get('file'); const movementId = Number(form.get('movementId') || 0) || null;
  if (!(file instanceof File)) return Response.json({ error: 'Selecciona un archivo.' }, { status: 400 });
  if (!allowed.has(file.type) || file.size > 10 * 1024 * 1024) return Response.json({ error: 'Formato no admitido o archivo mayor a 10 MB.' }, { status: 400 });
  if (movementId) { const owner = await getDb().select({ id: movements.id }).from(movements).where(and(eq(movements.id, movementId), eq(movements.userId, userId))).limit(1); if (!owner.length) return Response.json({ error: 'Movimiento no encontrado.' }, { status: 404 }); }
  const key = `${userId}/${crypto.randomUUID()}-${safeName(file.name)}`;
  await put(key, file, { access: 'private', addRandomSuffix: false, contentType: file.type });
  const [row] = await getDb().insert(attachments).values({ userId, movementId, storageKey: key, fileName: file.name.slice(0, 180), contentType: file.type, size: file.size, createdAt: new Date().toISOString() }).returning();
  if (movementId) await getDb().update(movements).set({ attachmentCount: sql`${movements.attachmentCount} + 1` }).where(and(eq(movements.id, movementId), eq(movements.userId, userId)));
  return Response.json({ id: row.id, fileName: row.fileName, size: row.size }, { status: 201 });
}

export async function GET(request: Request) {
  const userId = getRequestUserId(request); if (!userId) return new Response('Autenticación requerida', { status: 401 });
  const id = Number(new URL(request.url).searchParams.get('id')); if (!id) return new Response('Archivo inválido', { status: 400 });
  const [row] = await getDb().select().from(attachments).where(and(eq(attachments.id, id), eq(attachments.userId, userId))).limit(1); if (!row) return new Response('No encontrado', { status: 404 });
  const object = await get(row.storageKey, { access: 'private', useCache: false }); if (!object || object.statusCode !== 200) return new Response('No encontrado', { status: 404 });
  return new Response(object.stream, { headers: { 'Content-Type': row.contentType, 'Content-Disposition': `inline; filename="${row.fileName.replace(/["\r\n]/g, '')}"`, 'Cache-Control': 'private, no-store' } });
}

function safeName(value: string) { return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'archivo'; }
