RENAME TABLE `sensor_uploads` TO `multipart_uploads`;--> statement-breakpoint
ALTER TABLE `multipart_uploads` DROP INDEX `sensor_uploads_s3_upload_id_unique`;--> statement-breakpoint
ALTER TABLE `multipart_uploads` DROP FOREIGN KEY `sensor_uploads_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `multipart_uploads` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `multipart_uploads` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `multipart_uploads` ADD CONSTRAINT `multipart_uploads_s3_upload_id_unique` UNIQUE(`s3_upload_id`);--> statement-breakpoint
ALTER TABLE `multipart_uploads` ADD CONSTRAINT `multipart_uploads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;