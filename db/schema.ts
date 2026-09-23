import { boolean, doublePrecision, index, integer, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';

const timestamps = { createdAt: text('created_at').notNull(), updatedAt: text('updated_at') };

export const movements = pgTable('movements', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(),
  type: text('type', { enum: ['Gasto', 'Ingreso', 'Transferencia'] }).notNull(), amount: doublePrecision('amount').notNull(),
  description: text('description').notNull(), merchant: text('merchant'), category: text('category').notNull(), subcategory: text('subcategory'),
  paymentMethod: text('payment_method').notNull(), accountId: integer('account_id'), destinationAccountId: integer('destination_account_id'), cardId: integer('card_id'),
  installments: integer('installments').notNull().default(1), scope: text('scope').notNull().default('Personal'),
  status: text('status').notNull().default('Confirmado'), source: text('source').notNull().default('Manual'), movementDate: text('movement_date').notNull(),
  excludeBudget: boolean('exclude_budget').notNull().default(false), reviewed: boolean('reviewed').notNull().default(true),
  tags: text('tags').notNull().default('[]'), attachmentCount: integer('attachment_count').notNull().default(0), ...timestamps,
}, (table) => [index('idx_movements_user_date').on(table.userId, table.movementDate), index('idx_movements_user_type').on(table.userId, table.type), index('idx_movements_user_status').on(table.userId, table.status)]);

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(), name: text('name').notNull(), type: text('type').notNull(),
  balance: doublePrecision('balance').notNull().default(0), institution: text('institution').notNull().default(''), color: text('color').notNull().default('#6757dd'),
  active: boolean('active').notNull().default(true), ...timestamps,
}, (table) => [index('idx_accounts_user').on(table.userId)]);

export const creditCards = pgTable('credit_cards', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(), name: text('name').notNull(), bank: text('bank').notNull(), last4: text('last4').notNull(),
  creditLimit: doublePrecision('credit_limit').notNull(), used: doublePrecision('used').notNull().default(0), closingDay: integer('closing_day').notNull(), dueDay: integer('due_day').notNull(),
  nextPayment: doublePrecision('next_payment').notNull().default(0), color: text('color').notNull().default('#20273a'), active: boolean('active').notNull().default(true), ...timestamps,
}, (table) => [index('idx_credit_cards_user').on(table.userId)]);

export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(), name: text('name').notNull(), category: text('category').notNull(),
  limitAmount: doublePrecision('limit_amount').notNull(), month: text('month').notNull(), active: boolean('active').notNull().default(true), ...timestamps,
}, (table) => [index('idx_budgets_user_month').on(table.userId, table.month)]);

export const commitments = pgTable('commitments', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(), name: text('name').notNull(), kind: text('kind').notNull(),
  amount: doublePrecision('amount').notNull(), outstanding: doublePrecision('outstanding'), dueDate: text('due_date').notNull(), status: text('status').notNull().default('Pendiente'),
  installments: integer('installments'), paidInstallments: integer('paid_installments').notNull().default(0), movementId: integer('movement_id'), cardId: integer('card_id'),
  category: text('category').notNull().default('Otros'), ...timestamps,
}, (table) => [index('idx_commitments_user_due').on(table.userId, table.dueDate)]);

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(), name: text('name').notNull(), target: doublePrecision('target').notNull(),
  saved: doublePrecision('saved').notNull().default(0), targetDate: text('target_date').notNull(), color: text('color').notNull().default('#6757dd'), ...timestamps,
}, (table) => [index('idx_goals_user').on(table.userId)]);

export const recurring = pgTable('recurring', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(), name: text('name').notNull(), type: text('type').notNull(),
  amount: doublePrecision('amount').notNull(), frequency: text('frequency').notNull(), nextDate: text('next_date').notNull(), account: text('account').notNull(), category: text('category').notNull(),
  active: boolean('active').notNull().default(true), ...timestamps,
}, (table) => [index('idx_recurring_user_next').on(table.userId, table.nextDate)]);

export const rules = pgTable('rules', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(), contains: text('contains').notNull(), category: text('category').notNull(),
  subcategory: text('subcategory').notNull().default(''), active: boolean('active').notNull().default(true), ...timestamps,
}, (table) => [index('idx_rules_user').on(table.userId)]);

export const attachments = pgTable('attachments', {
  id: serial('id').primaryKey(), userId: text('user_id').notNull(), movementId: integer('movement_id'), storageKey: text('storage_key').notNull(),
  fileName: text('file_name').notNull(), contentType: text('content_type').notNull(), size: integer('size').notNull(), createdAt: text('created_at').notNull(),
}, (table) => [index('idx_attachments_user_movement').on(table.userId, table.movementId)]);

export const preferences = pgTable('preferences', {
  userId: text('user_id').primaryKey(), currency: text('currency').notNull().default('PEN'), dateFormat: text('date_format').notNull().default('DD/MM/YYYY'),
  theme: text('theme').notNull().default('system'), securityCushion: doublePrecision('security_cushion').notNull().default(400),
  dashboardPreferences: text('dashboard_preferences').notNull().default('{}'), notifications: text('notifications').notNull().default('{}'), updatedAt: text('updated_at').notNull(),
});

export const gmailConnections = pgTable('gmail_connections', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull().default(''),
  encryptedRefreshToken: text('encrypted_refresh_token').notNull(),
  historyId: text('history_id'),
  status: text('status').notNull().default('connected'),
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const ingestionEvents = pgTable('ingestion_events', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(),
  externalId: text('external_id').notNull(),
  fingerprint: text('fingerprint').notNull(),
  status: text('status').notNull(),
  rawSubject: text('raw_subject').notNull().default(''),
  error: text('error'),
  movementId: integer('movement_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_ingestion_provider_external').on(table.userId, table.provider, table.externalId),
  uniqueIndex('idx_ingestion_fingerprint').on(table.userId, table.fingerprint),
]);
