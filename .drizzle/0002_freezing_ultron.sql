ALTER TABLE `sensor_uploads` ADD `upload_id` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `plan` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `sensor_uploads` ADD CONSTRAINT `sensor_uploads_upload_id_unique` UNIQUE(`upload_id`);