import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { accounts, commitments, creditCards, movements, rules } from '@/db/schema';
import { getAuthenticatedUserId } from '@/lib/server-auth';

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  const url = new URL(request.url); const page = Math.max(1, Number(url.searchParams.get('page') || 1)); const size = Math.min(50, Math.max(5, Number(url.searchParams.get('size') || 10)));
  const search = url.searchParams.get('search')?.trim(); const type = url.searchParams.get('type'); const status = url.searchParams.get('status');
  const filters = [eq(movements.userId, userId)];
  if (search) filters.push(or(like(movements.description, `%${search}%`), like(movements.merchant, `%${search}%`), like(movements.category, `%${search}%`))!);
  if (type && ['Gasto', 'Ingreso', 'Transferencia'].includes(type)) filters.push(eq(movements.type, type as 'Gasto' | 'Ingreso' | 'Transferencia'));
  if (status) filters.push(eq(movements.status, status));
  const db = getDb(); const where = and(...filters);
  const [rows, totalRows] = await Promise.all([
    db.select().from(movements).where(where).orderBy(desc(movements.movementDate), desc(movements.id)).limit(size).offset((page - 1) * size),
    db.select({ count: sql<number>`count(*)` }).from(movements).where(where),
  ]);
  return Response.json({ rows: rows.map((m) => ({ ...m, tags: safeTags(m.tags) })), page, size, total: Number(totalRows[0]?.count ?? 0) });
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>; const amount = Number(body.amount); const type = String(body.type) as 'Gasto' | 'Ingreso' | 'Transferencia';
  if (!['Gasto', 'Ingreso', 'Transferencia'].includes(type) || !Number.isFinite(amount) || amount <= 0 || !String(body.description ?? '').trim()) return Response.json({ error: 'Completa tipo, monto y descripción.' }, { status: 400 });
  if (type === 'Transferencia' && (!body.accountId || !body.destinationAccountId || String(body.accountId) === String(body.destinationAccountId))) return Response.json({ error: 'Selecciona cuentas de origen y destino diferentes.' }, { status: 400 });
  const db = getDb();
  if (body.accountId) { const found = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, Number(body.accountId)), eq(accounts.userId, userId))).limit(1); if (!found.length) return Response.json({ error: 'La cuenta seleccionada no existe.' }, { status: 400 }); }
  if (body.cardId) { const found = await db.select({ id: creditCards.id }).from(creditCards).where(and(eq(creditCards.id, Number(body.cardId)), eq(creditCards.userId, userId))).limit(1); if (!found.length) return Response.json({ error: 'La tarjeta seleccionada no existe.' }, { status: 400 }); }
  let category = String(body.category || 'Otros').slice(0, 60); let subcategory = String(body.subcategory || '').slice(0, 60); let source = String(body.source || 'Manual').slice(0, 30);
  const activeRules = await db.select().from(rules).where(and(eq(rules.userId, userId), eq(rules.active, true)));
  const matchingRule = activeRules.find((rule) => `${body.description} ${body.merchant || ''}`.toUpperCase().includes(rule.contains.toUpperCase()));
  if (matchingRule) { category = matchingRule.category; subcategory = matchingRule.subcategory; source = source === 'Manual' ? 'Regla automática' : source; }
  const now = new Date().toISOString(); const installments = Math.min(60, Math.max(1, Number(body.installments || 1)));
  const inserted = await db.insert(movements).values({ userId, type, amount, description: String(body.description).trim().slice(0, 120), merchant: String(body.merchant || '').slice(0, 100), category, subcategory, paymentMethod: String(body.paymentMethod || 'Efectivo').slice(0, 40), accountId: body.accountId ? Number(body.accountId) : null, destinationAccountId: body.destinationAccountId ? Number(body.destinationAccountId) : null, cardId: body.cardId ? Number(body.cardId) : null, installments, scope: String(body.scope || 'Personal').slice(0, 30), status: String(body.status || 'Confirmado').slice(0, 30), source, movementDate: validDate(body.movementDate) ? String(body.movementDate) : now.slice(0, 10), excludeBudget: type === 'Transferencia' || Boolean(body.excludeBudget), reviewed: source !== 'Detectado', tags: JSON.stringify(Array.isArray(body.tags) ? body.tags.slice(0, 10).map(String) : []), attachmentCount: 0, createdAt: now, updatedAt: now }).returning();
  const movement = inserted[0];
  if (type === 'Gasto' && body.cardId) await db.update(creditCards).set({ used: sql`${creditCards.used} + ${amount}`, updatedAt: now }).where(and(eq(creditCards.id, Number(body.cardId)), eq(creditCards.userId, userId)));
  else if (type === 'Gasto' && body.accountId) await db.update(accounts).set({ balance: sql`${accounts.balance} - ${amount}`, updatedAt: now }).where(and(eq(accounts.id, Number(body.accountId)), eq(accounts.userId, userId)));
  else if (type === 'Ingreso' && body.accountId) await db.update(accounts).set({ balance: sql`${accounts.balance} + ${amount}`, updatedAt: now }).where(and(eq(accounts.id, Number(body.accountId)), eq(accounts.userId, userId)));
  else if (type === 'Transferencia') {
    await db.update(accounts).set({ balance: sql`${accounts.balance} - ${amount}`, updatedAt: now }).where(and(eq(accounts.id, Number(body.accountId)), eq(accounts.userId, userId)));
    await db.update(accounts).set({ balance: sql`${accounts.balance} + ${amount}`, updatedAt: now }).where(and(eq(accounts.id, Number(body.destinationAccountId)), eq(accounts.userId, userId)));
  }
  if (type === 'Gasto' && body.cardId && installments > 1) {
    const installmentAmount = Math.round((amount / installments) * 100) / 100;
    const firstDate = new Date(`${movement.movementDate}T12:00:00`);
    await db.insert(commitments).values(Array.from({ length: installments }, (_, index) => { const due = new Date(firstDate); due.setMonth(due.getMonth() + index + 1); return { userId, name: `${movement.description} · Cuota ${index + 1}/${installments}`, kind: 'Pagar', amount: installmentAmount, outstanding: installmentAmount, dueDate: due.toISOString().slice(0, 10), status: 'Pendiente', installments, paidInstallments: 0, movementId: movement.id, cardId: Number(body.cardId), category: 'Cuotas', createdAt: now, updatedAt: now }; }));
  }
  return Response.json({ ...movement, tags: safeTags(movement.tags), autoRule: matchingRule ? { category, subcategory } : null }, { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId(request); if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>; const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite).slice(0, 100) : [];
  if (!ids.length) return Response.json({ error: 'Selecciona al menos un movimiento.' }, { status: 400 });
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.category) updates.category = String(body.category).slice(0, 60); if (body.accountId) updates.accountId = Number(body.accountId);
  if (typeof body.reviewed === 'boolean') updates.reviewed = body.reviewed; if (typeof body.excludeBudget === 'boolean') updates.excludeBudget = body.excludeBudget;
  if (Array.isArray(body.tags)) updates.tags = JSON.stringify(body.tags.slice(0, 10).map(String));
  await getDb().update(movements).set(updates).where(and(eq(movements.userId, userId), inArray(movements.id, ids)));
  return Response.json({ updated: ids.length });
}

export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId(request); if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>; const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite).slice(0, 100) : [];
  if (!ids.length) return Response.json({ error: 'Selecciona movimientos.' }, { status: 400 });
  await getDb().delete(movements).where(and(eq(movements.userId, userId), inArray(movements.id, ids)));
  return Response.json({ deleted: ids.length });
}

function validDate(value: unknown) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`)); }
function safeTags(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

