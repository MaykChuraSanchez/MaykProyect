export type MovementType = 'Gasto' | 'Ingreso' | 'Transferencia';
export type MovementStatus =
  | 'Confirmado'
  | 'Pendiente'
  | 'Detectado'
  | 'Revisar';

export type Movement = {
  id: number | string;
  type: MovementType;
  amount: number;
  description: string;
  merchant?: string;
  category: string;
  subcategory?: string;
  paymentMethod: string;
  accountId?: string | number | null;
  destinationAccountId?: string | number | null;
  cardId?: string | number | null;
  installments?: number;
  scope: string;
  status: string;
  source: string;
  movementDate: string;
  excludeBudget?: boolean;
  reviewed?: boolean;
  tags?: string[];
  attachmentCount?: number;
};

export type Account = {
  id: string | number;
  name: string;
  type: string;
  balance: number;
  institution: string;
  color: string;
  active?: boolean;
};
export type CreditCard = {
  id: string | number;
  name: string;
  bank: string;
  last4: string;
  limit: number;
  used: number;
  closingDay: number;
  dueDay: number;
  nextPayment: number;
  color: string;
  active?: boolean;
};
export type Budget = {
  id: string | number;
  name: string;
  category: string;
  limit: number;
  spent: number;
  month: string;
};
export type Commitment = {
  id: string | number;
  name: string;
  kind: 'Pagar' | 'Cobrar' | 'Financiamiento';
  amount: number;
  outstanding?: number;
  dueDate: string;
  status: string;
  installments?: number;
  paidInstallments?: number;
  category: string;
};
export type Goal = {
  id: string | number;
  name: string;
  target: number;
  saved: number;
  targetDate: string;
  color: string;
};
export type Recurring = {
  id: string | number;
  name: string;
  type: 'Gasto' | 'Ingreso';
  amount: number;
  frequency: string;
  nextDate: string;
  account: string;
  category: string;
  active: boolean;
};
export type Rule = {
  id: string | number;
  contains: string;
  category: string;
  subcategory: string;
  active: boolean;
};

export type FinanceData = {
  movements: Movement[];
  accounts: Account[];
  cards: CreditCard[];
  budgets: Budget[];
  commitments: Commitment[];
  goals: Goal[];
  recurring: Recurring[];
  rules: Rule[];
  securityCushion: number;
  demoMode?: boolean;
};

export const emptyFinanceData = (): FinanceData => ({
  demoMode: false,
  securityCushion: 400,
  accounts: [],
  cards: [],
  movements: [],
  budgets: [],
  commitments: [],
  goals: [],
  recurring: [],
  rules: [],
});

export const demoFinanceData: FinanceData = {
  demoMode: true,
  securityCushion: 400,
  accounts: [
    {
      id: 'a1',
      name: 'Cuenta sueldo',
      type: 'Cuenta bancaria',
      balance: 3450,
      institution: 'Interbank',
      color: '#6757dd',
    },
    {
      id: 'a2',
      name: 'Ahorros',
      type: 'Ahorro',
      balance: 1320,
      institution: 'BBVA',
      color: '#2079df',
    },
    {
      id: 'a3',
      name: 'Yape',
      type: 'Billetera digital',
      balance: 650,
      institution: 'Yape',
      color: '#7d35bd',
    },
    {
      id: 'a4',
      name: 'Efectivo',
      type: 'Efectivo',
      balance: 400,
      institution: 'Billetera',
      color: '#19a878',
    },
  ],
  cards: [
    {
      id: 'c1',
      name: 'Visa Signature',
      bank: 'Interbank',
      last4: '2841',
      limit: 8000,
      used: 2750,
      closingDay: 12,
      dueDay: 22,
      nextPayment: 1320,
      color: '#20273a',
    },
    {
      id: 'c2',
      name: 'Visa Oro',
      bank: 'BBVA',
      last4: '7320',
      limit: 5000,
      used: 980,
      closingDay: 18,
      dueDay: 28,
      nextPayment: 620,
      color: '#145cc5',
    },
  ],
  movements: [
    {
      id: 'm1',
      type: 'Gasto',
      amount: 87.6,
      description: 'Compra semanal',
      merchant: 'Plaza Vea',
      category: 'Alimentación',
      subcategory: 'Supermercado',
      paymentMethod: 'Tarjeta de crédito',
      accountId: 'a1',
      cardId: 'c1',
      scope: 'Hogar',
      status: 'Confirmado',
      source: 'Boleta',
      movementDate: '2026-09-18',
      attachmentCount: 1,
    },
    {
      id: 'm2',
      type: 'Gasto',
      amount: 23,
      description: 'Viaje oficina',
      merchant: 'Uber',
      category: 'Transporte',
      subcategory: 'Apps',
      paymentMethod: 'Yape',
      accountId: 'a3',
      scope: 'Personal',
      status: 'Confirmado',
      source: 'Captura',
      movementDate: '2026-09-18',
    },
    {
      id: 'm3',
      type: 'Ingreso',
      amount: 3200,
      description: 'Pago de quincena',
      merchant: 'Empresa',
      category: 'Ingresos',
      subcategory: 'Sueldo',
      paymentMethod: 'Transferencia',
      accountId: 'a1',
      scope: 'Personal',
      status: 'Confirmado',
      source: 'Correo',
      movementDate: '2026-09-15',
    },
    {
      id: 'm4',
      type: 'Gasto',
      amount: 45,
      description: 'Verduras y frutas',
      merchant: 'Mercado local',
      category: 'Alimentación',
      subcategory: 'Mercado',
      paymentMethod: 'Efectivo',
      accountId: 'a4',
      scope: 'Hogar',
      status: 'Confirmado',
      source: 'Manual',
      movementDate: '2026-09-17',
    },
    {
      id: 'm5',
      type: 'Transferencia',
      amount: 500,
      description: 'Recarga Yape',
      merchant: '',
      category: 'Transferencia interna',
      paymentMethod: 'Transferencia',
      accountId: 'a1',
      destinationAccountId: 'a3',
      scope: 'Personal',
      status: 'Confirmado',
      source: 'Manual',
      movementDate: '2026-09-16',
      excludeBudget: true,
    },
    {
      id: 'm6',
      type: 'Gasto',
      amount: 149.9,
      description: 'Internet hogar',
      merchant: 'Movistar',
      category: 'Vivienda',
      subcategory: 'Internet',
      paymentMethod: 'Débito automático',
      accountId: 'a1',
      scope: 'Hogar',
      status: 'Confirmado',
      source: 'Correo',
      movementDate: '2026-09-12',
    },
    {
      id: 'm7',
      type: 'Gasto',
      amount: 420,
      description: 'Cena celebración',
      merchant: 'Central',
      category: 'Alimentación',
      subcategory: 'Restaurantes',
      paymentMethod: 'Tarjeta de crédito',
      cardId: 'c1',
      scope: 'Compartido',
      status: 'Revisar',
      source: 'Correo',
      movementDate: '2026-09-14',
    },
    {
      id: 'm8',
      type: 'Ingreso',
      amount: 500,
      description: 'Proyecto freelance',
      merchant: 'Cliente ACME',
      category: 'Ingresos',
      subcategory: 'Adicional',
      paymentMethod: 'Transferencia',
      accountId: 'a2',
      scope: 'Personal',
      status: 'Confirmado',
      source: 'Manual',
      movementDate: '2026-09-08',
    },
    {
      id: 'm9',
      type: 'Gasto',
      amount: 65,
      description: 'Combustible',
      merchant: 'Primax',
      category: 'Transporte',
      subcategory: 'Combustible',
      paymentMethod: 'Débito',
      accountId: 'a1',
      scope: 'Personal',
      status: 'Confirmado',
      source: 'Correo',
      movementDate: '2026-09-07',
    },
    {
      id: 'm10',
      type: 'Gasto',
      amount: 39.9,
      description: 'Netflix',
      merchant: 'Netflix',
      category: 'Entretenimiento',
      subcategory: 'Streaming',
      paymentMethod: 'Tarjeta de crédito',
      cardId: 'c2',
      scope: 'Hogar',
      status: 'Confirmado',
      source: 'Correo',
      movementDate: '2026-09-05',
    },
  ],
  budgets: [
    {
      id: 'b1',
      name: 'Supermercado',
      category: 'Alimentación',
      limit: 700,
      spent: 480,
      month: '2026-09',
    },
    {
      id: 'b2',
      name: 'Transporte',
      category: 'Transporte',
      limit: 400,
      spent: 318,
      month: '2026-09',
    },
    {
      id: 'b3',
      name: 'Restaurantes',
      category: 'Restaurantes',
      limit: 300,
      spent: 284,
      month: '2026-09',
    },
    {
      id: 'b4',
      name: 'Entretenimiento',
      category: 'Entretenimiento',
      limit: 220,
      spent: 96,
      month: '2026-09',
    },
  ],
  commitments: [
    {
      id: 'p1',
      name: 'Tarjeta Interbank',
      kind: 'Pagar',
      amount: 1320,
      dueDate: '2026-09-22',
      status: 'Pendiente',
      category: 'Tarjetas',
    },
    {
      id: 'p2',
      name: 'Alquiler',
      kind: 'Pagar',
      amount: 700,
      dueDate: '2026-09-30',
      status: 'Pendiente',
      category: 'Vivienda',
    },
    {
      id: 'p3',
      name: 'Cochera',
      kind: 'Pagar',
      amount: 300,
      dueDate: '2026-09-30',
      status: 'Pendiente',
      category: 'Vivienda',
    },
    {
      id: 'p4',
      name: 'Juan · compra compartida',
      kind: 'Cobrar',
      amount: 300,
      dueDate: '2026-09-30',
      status: 'Pendiente',
      category: 'Cobros',
    },
    {
      id: 'p5',
      name: 'Laptop',
      kind: 'Financiamiento',
      amount: 3000,
      outstanding: 2000,
      dueDate: '2026-10-05',
      status: 'Activo',
      installments: 6,
      paidInstallments: 2,
      category: 'Tecnología',
    },
  ],
  goals: [
    {
      id: 'g1',
      name: 'Fondo de emergencia',
      target: 12000,
      saved: 6800,
      targetDate: '2027-04-30',
      color: '#169b72',
    },
    {
      id: 'g2',
      name: 'Laptop nueva',
      target: 5000,
      saved: 2800,
      targetDate: '2026-12-15',
      color: '#6757dd',
    },
  ],
  recurring: [
    {
      id: 'r1',
      name: 'Sueldo fin de mes',
      type: 'Ingreso',
      amount: 3200,
      frequency: 'Mensual',
      nextDate: '2026-09-30',
      account: 'Cuenta sueldo',
      category: 'Ingresos',
      active: true,
    },
    {
      id: 'r2',
      name: 'Internet hogar',
      type: 'Gasto',
      amount: 149.9,
      frequency: 'Mensual',
      nextDate: '2026-09-20',
      account: 'Cuenta sueldo',
      category: 'Vivienda',
      active: true,
    },
    {
      id: 'r3',
      name: 'Netflix',
      type: 'Gasto',
      amount: 39.9,
      frequency: 'Mensual',
      nextDate: '2026-09-25',
      account: 'Visa Oro',
      category: 'Entretenimiento',
      active: true,
    },
  ],
  rules: [
    {
      id: 'rule1',
      contains: 'PLAZA VEA',
      category: 'Alimentación',
      subcategory: 'Supermercado',
      active: true,
    },
    {
      id: 'rule2',
      contains: 'UBER',
      category: 'Transporte',
      subcategory: 'Apps',
      active: true,
    },
    {
      id: 'rule3',
      contains: 'NETFLIX',
      category: 'Entretenimiento',
      subcategory: 'Streaming',
      active: true,
    },
    {
      id: 'rule4',
      contains: 'PRIMAX',
      category: 'Transporte',
      subcategory: 'Combustible',
      active: true,
    },
  ],
};

const currentDate = () => new Date().toISOString().slice(0, 10);
const sameMonth = (date: string, reference = currentDate()) =>
  date.slice(0, 7) === reference.slice(0, 7);

export function calculateFinancialSummary(data: FinanceData) {
  const confirmed = data.movements.filter((m) => m.status === 'Confirmado');
  const month = confirmed.filter((m) => sameMonth(m.movementDate));
  const income = month
    .filter((m) => m.type === 'Ingreso')
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const expenses = month
    .filter((m) => m.type === 'Gasto')
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const available = data.accounts
    .filter((a) => a.active !== false)
    .reduce((sum, a) => sum + Number(a.balance), 0);
  const cardDebt = data.cards
    .filter((c) => c.active !== false)
    .reduce((sum, c) => sum + Number(c.used), 0);
  const financingDebt = data.commitments
    .filter((c) => c.kind === 'Financiamiento' && c.status !== 'Pagado')
    .reduce((sum, c) => sum + Number(c.outstanding ?? c.amount), 0);
  const debt = cardDebt + financingDebt;
  const assets =
    available + data.goals.reduce((sum, goal) => sum + Number(goal.saved), 0);
  const pendingPayments = data.commitments
    .filter((c) => c.kind === 'Pagar' && c.status !== 'Pagado')
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingIncome =
    data.commitments
      .filter((c) => c.kind === 'Cobrar' && c.status !== 'Pagado')
      .reduce((sum, c) => sum + Number(c.amount), 0) +
    data.recurring
      .filter((r) => r.type === 'Ingreso' && r.active)
      .reduce((sum, r) => sum + Number(r.amount), 0);
  const recurringExpenses = data.recurring
    .filter(
      (r) => r.type === 'Gasto' && r.active && r.nextDate >= currentDate(),
    )
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const cardPayments = data.cards.reduce(
    (sum, card) => sum + Number(card.nextPayment),
    0,
  );
  const variableEstimate = 900;
  const budgetReserve = Math.max(
    0,
    data.budgets.reduce((sum, b) => sum + Math.max(0, b.limit - b.spent), 0) *
      0.2,
  );
  const availableToSpend = Math.max(
    0,
    available -
      pendingPayments -
      cardPayments -
      budgetReserve -
      data.securityCushion,
  );
  const nextIncome = data.recurring
    .filter((r) => r.type === 'Ingreso' && r.active)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))[0];
  const daysToIncome = nextIncome
    ? Math.max(
        1,
        Math.ceil(
          (new Date(`${nextIncome.nextDate}T12:00:00`).getTime() -
            new Date(`${currentDate()}T12:00:00`).getTime()) /
            86400000,
        ),
      )
    : 0;
  const untilNextIncome = Math.max(0, availableToSpend - 1200);
  const projectionBase =
    available +
    pendingIncome -
    pendingPayments -
    cardPayments -
    recurringExpenses -
    variableEstimate;
  const savings = income - expenses;
  return {
    available,
    income,
    expenses,
    netFlow: income - expenses,
    debt,
    netWorth: assets - debt,
    savings,
    savingsRate: income ? (savings / income) * 100 : 0,
    cardDebt,
    pendingPayments,
    availableToSpend,
    securityCushion: data.securityCushion,
    nextIncomeDate: nextIncome?.nextDate ?? null,
    daysToIncome,
    untilNextIncome,
    dailyRecommended: daysToIncome ? untilNextIncome / daysToIncome : 0,
    projection: {
      conservative: projectionBase - 480,
      base: projectionBase,
      optimistic: projectionBase + 420,
    },
    todayExpenses: confirmed
      .filter((m) => m.type === 'Gasto' && m.movementDate === currentDate())
      .reduce((sum, m) => sum + Number(m.amount), 0),
    todayIncome: confirmed
      .filter((m) => m.type === 'Ingreso' && m.movementDate === currentDate())
      .reduce((sum, m) => sum + Number(m.amount), 0),
    needsReview: data.movements.filter((m) =>
      ['Revisar', 'Detectado'].includes(m.status),
    ).length,
  };
}

export function budgetLevel(spent: number, limit: number) {
  const percentage = limit ? Math.round((spent / limit) * 100) : 0;
  if (percentage > 100)
    return { percentage, label: 'Excedido', tone: 'danger' };
  if (percentage >= 90)
    return { percentage, label: 'Cerca del límite', tone: 'danger' };
  if (percentage >= 70)
    return { percentage, label: 'Atención', tone: 'warning' };
  return { percentage, label: 'Normal', tone: 'good' };
}

export function generateInsights(data: FinanceData) {
  const summary = calculateFinancialSummary(data);
  const largestBudget = [...data.budgets].sort(
    (a, b) => b.spent / b.limit - a.spent / a.limit,
  )[0] ?? { name: 'Presupuestos', spent: 0, limit: 1 };
  const upcoming = data.commitments.filter(
    (c) =>
      c.status !== 'Pagado' &&
      c.dueDate <=
        new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  ).length;
  return [
    {
      tone: 'good',
      title: `Tu flujo neto es ${summary.netFlow >= 0 ? 'positivo' : 'negativo'}`,
      detail: `${summary.netFlow >= 0 ? 'Mantienes' : 'Revisa'} un margen de ${formatMoney(Math.abs(summary.netFlow))} este mes.`,
    },
    {
      tone: budgetLevel(largestBudget.spent, largestBudget.limit).tone,
      title: `${largestBudget.name}: ${budgetLevel(largestBudget.spent, largestBudget.limit).percentage}% usado`,
      detail: `Te quedan ${formatMoney(Math.max(0, largestBudget.limit - largestBudget.spent))} en esta categoría.`,
    },
    {
      tone: upcoming ? 'warning' : 'good',
      title: `${upcoming} pagos en los próximos 7 días`,
      detail: upcoming
        ? 'El más próximo es tu tarjeta Interbank.'
        : 'No tienes pagos inmediatos.',
    },
  ];
}

export function answerFinancialQuestion(question: string, data: FinanceData) {
  const q = question.toLowerCase();
  const summary = calculateFinancialSummary(data);
  if (/plaza vea/.test(q)) {
    const value = data.movements
      .filter(
        (m) =>
          (m.merchant ?? '').toLowerCase().includes('plaza vea') &&
          m.type === 'Gasto',
      )
      .reduce((s, m) => s + m.amount, 0);
    return `Gastaste ${formatMoney(value)} en Plaza Vea en los movimientos registrados.`;
  }
  if (/debo|deuda|tarjeta/.test(q))
    return `Tu deuda total es ${formatMoney(summary.debt)}. De ese monto, ${formatMoney(summary.cardDebt)} corresponde a tarjetas.`;
  if (/disponible.*próximo|próximo ingreso|diario/.test(q))
    return `Puedes usar aproximadamente ${formatMoney(summary.untilNextIncome)} hasta tu próximo ingreso. Son ${summary.daysToIncome} días, con un promedio recomendado de ${formatMoney(summary.dailyRecommended)} al día.`;
  if (/disponible|cuánto tengo|cuanto tengo/.test(q))
    return `Tienes ${formatMoney(summary.available)} en cuentas y efectivo. Después de compromisos y tu colchón de seguridad, tu disponible real para gastar es ${formatMoney(summary.availableToSpend)}.`;
  if (/mayor gasto/.test(q)) {
    const largest = [...data.movements]
      .filter((m) => m.type === 'Gasto')
      .sort((a, b) => b.amount - a.amount)[0];
    return `Tu mayor gasto registrado fue ${largest?.merchant || largest?.description}: ${formatMoney(largest?.amount || 0)}.`;
  }
  if (/comida|alimentación|alimentacion/.test(q)) {
    const value = data.movements
      .filter((m) => m.type === 'Gasto' && m.category === 'Alimentación')
      .reduce((s, m) => s + m.amount, 0);
    return `Gastaste ${formatMoney(value)} en alimentación durante el período visible.`;
  }
  if (/ahorrar|ahorro|cierre/.test(q))
    return `En el escenario base cerrarías el mes con ${formatMoney(summary.projection.base)}. Tu ahorro acumulado del mes es ${formatMoney(summary.savings)}.`;
  if (/pago|semana|viene/.test(q)) {
    const items = data.commitments
      .filter((c) => c.status !== 'Pagado')
      .slice(0, 3)
      .map((c) => `${c.name} (${formatMoney(c.amount)})`)
      .join(', ');
    return `Tus próximos compromisos son: ${items || 'no tienes compromisos pendientes'}.`;
  }
  return `Este mes registras ${formatMoney(summary.income)} de ingresos y ${formatMoney(summary.expenses)} de gastos. Tu flujo neto es ${formatMoney(summary.netFlow)}.`;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value);
}
