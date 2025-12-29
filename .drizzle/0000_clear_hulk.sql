CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`sub` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_sub_unique` UNIQUE(`sub`)
);
--> statement-breakpoint
CREATE TABLE `sensor_uploads` (
	`user_id` varchar(36) NOT NULL,
	`upload_id` varchar(36) NOT NULL,
	`data_name` varchar(255) NOT NULL,
	`parts` json NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `sensor_uploads_upload_id` PRIMARY KEY(`upload_id`)
);
--> statement-breakpoint
ALTER TABLE `sensor_uploads` ADD CONSTRAINT `sensor_uploads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;