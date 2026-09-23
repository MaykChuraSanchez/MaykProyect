CREATE TABLE `movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`payment_method` text NOT NULL,
	`scope` text DEFAULT 'Personal' NOT NULL,
	`status` text DEFAULT 'Confirmado' NOT NULL,
	`source` text DEFAULT 'Manual' NOT NULL,
	`movement_date` text NOT NULL,
	`created_at` text NOT NULL
);
