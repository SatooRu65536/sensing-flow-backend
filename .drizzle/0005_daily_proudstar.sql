CREATE TABLE `sensor_data` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`data_name` varchar(255) NOT NULL,
	`s3_key` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `sensor_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sensor_data` ADD CONSTRAINT `sensor_data_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;