CREATE TABLE `gmail_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`encrypted_refresh_token` text NOT NULL,
	`history_id` text,
	`status` text DEFAULT 'connected' NOT NULL,
	`last_sync_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingestion_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text NOT NULL,
	`raw_subject` text DEFAULT '' NOT NULL,
	`error` text,
	`movement_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ingestion_provider_external` ON `ingestion_events` (`user_id`,`provider`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ingestion_fingerprint` ON `ingestion_events` (`user_id`,`fingerprint`);
