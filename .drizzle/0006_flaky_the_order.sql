CREATE TABLE `rate_limit_logs` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`permission` varchar(255) NOT NULL,
	`timestamp` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `rate_limit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rate_limit_logs` ADD CONSTRAINT `rate_limit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;