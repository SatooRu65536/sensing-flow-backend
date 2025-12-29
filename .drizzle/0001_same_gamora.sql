ALTER TABLE `sensor_uploads` RENAME COLUMN `upload_id` TO `id`;--> statement-breakpoint
ALTER TABLE `sensor_uploads` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `sensor_uploads` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `sensor_uploads` ADD `status` varchar(16) NOT NULL;