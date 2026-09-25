import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { accounts, budgets, commitments, creditCards, goals, movements, preferences, recurring, rules } from '@/db/schema';
import { demoFinanceData, type FinanceData } from '@/lib/finance';

export async function loadFinanceData(userId: string): Promise<FinanceData> {
  const db = getDb();
  const [movementRows, accountRows, cardRows, budgetRows, commitmentRows, goalRows, recurringRows, ruleRows, preferenceRows] = await Promise.all([
    db.select().from(movements).where(eq(movements.userId, userId)).orderBy(desc(movements.movementDate), desc(movements.id)).limit(250),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select().from(creditCards).where(eq(creditCards.userId, userId)),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db.select().from(commitments).where(eq(commitments.userId, userId)).orderBy(commitments.dueDate),
    db.select().from(goals).where(eq(goals.userId, userId)),
    db.select().from(recurring).where(eq(recurring.userId, userId)).orderBy(recurring.nextDate),
    db.select().from(rules).where(eq(rules.userId, userId)),
    db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1),
  ]);

  const hasData = movementRows.length + accountRows.length + cardRows.length + budgetRows.length + commitmentRows.length + goalRows.length > 0;
  if (!hasData) return structuredClone(demoFinanceData);
  const spentByCategory = new Map<string, number>();
  for (const movement of movementRows) if (movement.type === 'Gasto' && movement.status === 'Confirmado' && !movement.excludeBudget && movement.movementDate.startsWith('2026-09')) spentByCategory.set(movement.category, (spentByCategory.get(movement.category) ?? 0) + movement.amount);

  return {
    demoMode: false,
    securityCushion: preferenceRows[0]?.securityCushion ?? 400,
    movements: movementRows.map((m) => ({ id: m.id, type: m.type, amount: m.amount, description: m.description, merchant: m.merchant ?? undefined, category: m.category, subcategory: m.subcategory ?? undefined, paymentMethod: m.paymentMethod, accountId: m.accountId, destinationAccountId: m.destinationAccountId, cardId: m.cardId, installments: m.installments, scope: m.scope, status: m.status, source: m.source, movementDate: m.movementDate, excludeBudget: m.excludeBudget, reviewed: m.reviewed, tags: safeJsonArray(m.tags), attachmentCount: m.attachmentCount ?? 0 })),
    accounts: accountRows.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: a.balance, institution: a.institution, color: a.color, active: a.active })),
    cards: cardRows.map((c) => ({ id: c.id, name: c.name, bank: c.bank, last4: c.last4, limit: c.creditLimit, used: c.used, closingDay: c.closingDay, dueDay: c.dueDay, nextPayment: c.nextPayment, color: c.color, active: c.active })),
    budgets: budgetRows.map((b) => ({ id: b.id, name: b.name, category: b.category, limit: b.limitAmount, spent: spentByCategory.get(b.category) ?? 0, month: b.month })),
    commitments: commitmentRows.map((c) => ({ id: c.id, name: c.name, kind: c.kind as 'Pagar' | 'Cobrar' | 'Financiamiento', amount: c.amount, outstanding: c.outstanding ?? undefined, dueDate: c.dueDate, status: c.status, installments: c.installments ?? undefined, paidInstallments: c.paidInstallments, category: c.category })),
    goals: goalRows.map((g) => ({ id: g.id, name: g.name, target: g.target, saved: g.saved, targetDate: g.targetDate, color: g.color })),
    recurring: recurringRows.map((r) => ({ id: r.id, name: r.name, type: r.type as 'Gasto' | 'Ingreso', amount: r.amount, frequency: r.frequency, nextDate: r.nextDate, account: r.account, category: r.category, active: r.active })),
    rules: ruleRows.map((r) => ({ id: r.id, contains: r.contains, category: r.category, subcategory: r.subcategory, active: r.active })),
  };
}

function safeJsonArray(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } }

