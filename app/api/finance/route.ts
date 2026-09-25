import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { accounts, budgets, commitments, creditCards, goals, preferences, recurring, rules } from '@/db/schema';
import { loadFinanceData } from '@/lib/server-finance';
import { getAuthenticatedUserId } from '@/lib/server-auth';

const now = () => new Date().toISOString();
const positive = (value: unknown) => { const amount = Number(value); return Number.isFinite(amount) && amount > 0 ? amount : null; };

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request); if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  return Response.json(await loadFinanceData(userId));
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request); if (!userId) return Response.json({ error: 'Autenticación requerida' }, { status: 401 });
  const body = await request.json() as Record<string, unknown>; const kind = String(body.kind || ''); const db = getDb(); const stamp = now();
  try {
    if (kind === 'account') {
      const balance = Number(body.balance || 0); if (!String(body.name || '').trim() || !Number.isFinite(balance)) throw new Error('Completa el nombre y un saldo válido.');
      const [row] = await db.insert(accounts).values({ userId, name: String(body.name).trim().slice(0, 80), type: String(body.type || 'Cuenta bancaria'), balance, institution: String(body.institution || '').slice(0, 80), color: String(body.color || '#6757dd'), active: true, createdAt: stamp, updatedAt: stamp }).returning(); return Response.json(row, { status: 201 });
    }
    if (kind === 'card') {
      const limit = positive(body.limit); if (!limit || !String(body.name || '').trim() || !/^\d{4}$/.test(String(body.last4 || ''))) throw new Error('Completa nombre, últimos 4 dígitos y línea total.');
      const [row] = await db.insert(creditCards).values({ userId, name: String(body.name).trim().slice(0, 80), bank: String(body.bank || '').slice(0, 80), last4: String(body.last4), creditLimit: limit, used: Math.max(0, Number(body.used || 0)), closingDay: Math.min(31, Math.max(1, Number(body.closingDay || 1))), dueDay: Math.min(31, Math.max(1, Number(body.dueDay || 1))), nextPayment: Math.max(0, Number(body.nextPayment || 0)), color: String(body.color || '#20273a'), active: true, createdAt: stamp, updatedAt: stamp }).returning(); return Response.json(row, { status: 201 });
    }
    if (kind === 'budget') {
      const limit = positive(body.limit); if (!limit || !String(body.name || '').trim()) throw new Error('Completa el nombre y el límite.');
      const [row] = await db.insert(budgets).values({ userId, name: String(body.name).trim().slice(0, 80), category: String(body.category || 'Otros'), limitAmount: limit, month: String(body.month || stamp.slice(0, 7)), active: true, createdAt: stamp, updatedAt: stamp }).returning(); return Response.json(row, { status: 201 });
    }
    if (kind === 'commitment') {
      const amount = positive(body.amount); if (!amount || !String(body.name || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate || ''))) throw new Error('Completa nombre, monto y fecha.');
      const requestedKind = String(body.commitmentKind || ''); const commitmentKind = ['Pagar', 'Cobrar', 'Financiamiento'].includes(requestedKind) ? requestedKind : 'Pagar';
      const [row] = await db.insert(commitments).values({ userId, name: String(body.name).trim().slice(0, 100), kind: commitmentKind, amount, outstanding: commitmentKind === 'Financiamiento' ? Math.max(0, Number(body.outstanding || amount)) : null, dueDate: String(body.dueDate), status: 'Pendiente', installments: body.installments ? Math.max(1, Number(body.installments)) : null, paidInstallments: 0, category: String(body.category || 'Otros'), createdAt: stamp, updatedAt: stamp }).returning(); return Response.json(row, { status: 201 });
    }
    if (kind === 'goal') {
      const target = positive(body.target); if (!target || !String(body.name || '').trim()) throw new Error('Completa el nombre y la meta.');
      const [row] = await db.insert(goals).values({ userId, name: String(body.name).trim().slice(0, 80), target, saved: Math.max(0, Number(body.saved || 0)), targetDate: String(body.targetDate || stamp.slice(0, 10)), color: String(body.color || '#6757dd'), createdAt: stamp, updatedAt: stamp }).returning(); return Response.json(row, { status: 201 });
    }
    if (kind === 'goalContribution') {
      const amount = positive(body.amount); const id = Number(body.id); if (!amount || !id) throw new Error('Indica una meta y un aporte válido.');
      await db.update(goals).set({ saved: sql`${goals.saved} + ${amount}`, updatedAt: stamp }).where(and(eq(goals.id, id), eq(goals.userId, userId))); return Response.json({ updated: true });
    }
    if (kind === 'recurring') {
      const amount = positive(body.amount); if (!amount || !String(body.name || '').trim()) throw new Error('Completa nombre y monto.');
      const [row] = await db.insert(recurring).values({ userId, name: String(body.name).trim().slice(0, 100), type: body.type === 'Ingreso' ? 'Ingreso' : 'Gasto', amount, frequency: String(body.frequency || 'Mensual'), nextDate: String(body.nextDate || stamp.slice(0, 10)), account: String(body.account || ''), category: String(body.category || 'Otros'), active: true, createdAt: stamp, updatedAt: stamp }).returning(); return Response.json(row, { status: 201 });
    }
    if (kind === 'rule') {
      if (!String(body.contains || '').trim()) throw new Error('Escribe el texto que debe reconocer la regla.');
      const [row] = await db.insert(rules).values({ userId, contains: String(body.contains).trim().toUpperCase().slice(0, 100), category: String(body.category || 'Otros'), subcategory: String(body.subcategory || ''), active: true, createdAt: stamp, updatedAt: stamp }).returning(); return Response.json(row, { status: 201 });
    }
    if (kind === 'preferences') {
      const securityCushion = Math.max(0, Number(body.securityCushion || 0));
      await db.insert(preferences).values({ userId, securityCushion, theme: String(body.theme || 'system'), currency: 'PEN', dateFormat: 'DD/MM/YYYY', dashboardPreferences: '{}', notifications: '{}', updatedAt: stamp }).onConflictDoUpdate({ target: preferences.userId, set: { securityCushion, theme: String(body.theme || 'system'), updatedAt: stamp } }); return Response.json({ updated: true });
    }
    throw new Error('Tipo de registro no válido.');
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'No se pudo guardar.' }, { status: 400 }); }
}

