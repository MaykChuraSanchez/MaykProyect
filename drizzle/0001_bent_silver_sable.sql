CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`institution` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '#6757dd' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_accounts_user` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`movement_id` integer,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_user_movement` ON `attachments` (`user_id`,`movement_id`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`limit_amount` real NOT NULL,
	`month` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_budgets_user_month` ON `budgets` (`user_id`,`month`);--> statement-breakpoint
CREATE TABLE `commitments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`amount` real NOT NULL,
	`outstanding` real,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'Pendiente' NOT NULL,
	`installments` integer,
	`paid_installments` integer DEFAULT 0 NOT NULL,
	`movement_id` integer,
	`card_id` integer,
	`category` text DEFAULT 'Otros' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_commitments_user_due` ON `commitments` (`user_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `credit_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`bank` text NOT NULL,
	`last4` text NOT NULL,
	`credit_limit` real NOT NULL,
	`used` real DEFAULT 0 NOT NULL,
	`closing_day` integer NOT NULL,
	`due_day` integer NOT NULL,
	`next_payment` real DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#20273a' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_credit_cards_user` ON `credit_cards` (`user_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`target` real NOT NULL,
	`saved` real DEFAULT 0 NOT NULL,
	`target_date` text NOT NULL,
	`color` text DEFAULT '#6757dd' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_goals_user` ON `goals` (`user_id`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`currency` text DEFAULT 'PEN' NOT NULL,
	`date_format` text DEFAULT 'DD/MM/YYYY' NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`security_cushion` real DEFAULT 400 NOT NULL,
	`dashboard_preferences` text DEFAULT '{}' NOT NULL,
	`notifications` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recurring` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`frequency` text NOT NULL,
	`next_date` text NOT NULL,
	`account` text NOT NULL,
	`category` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_user_next` ON `recurring` (`user_id`,`next_date`);--> statement-breakpoint
CREATE TABLE `rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`contains` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_rules_user` ON `rules` (`user_id`);--> statement-breakpoint
ALTER TABLE `movements` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `movements` ADD `merchant` text;--> statement-breakpoint
ALTER TABLE `movements` ADD `subcategory` text;--> statement-breakpoint
ALTER TABLE `movements` ADD `account_id` integer;--> statement-breakpoint
ALTER TABLE `movements` ADD `destination_account_id` integer;--> statement-breakpoint
ALTER TABLE `movements` ADD `card_id` integer;--> statement-breakpoint
ALTER TABLE `movements` ADD `installments` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `movements` ADD `exclude_budget` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `movements` ADD `reviewed` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `movements` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `movements` ADD `attachment_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `movements` ADD `updated_at` text;--> statement-breakpoint
CREATE INDEX `idx_movements_user_date` ON `movements` (`user_id`,`movement_date`);--> statement-breakpoint
CREATE INDEX `idx_movements_user_type` ON `movements` (`user_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_movements_user_status` ON `movements` (`user_id`,`status`);