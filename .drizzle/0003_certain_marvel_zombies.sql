ALTER TABLE `sensor_uploads` RENAME COLUMN `upload_id` TO `s3_upload_id`;--> statement-breakpoint
ALTER TABLE `sensor_uploads` DROP INDEX `sensor_uploads_upload_id_unique`;--> statement-breakpoint
ALTER TABLE `sensor_uploads` ADD CONSTRAINT `sensor_uploads_s3_upload_id_unique` UNIQUE(`s3_upload_id`);