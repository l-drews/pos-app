CREATE TABLE `groups` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_name_unique` ON `groups` (`name`);--> statement-breakpoint
CREATE TABLE `user_logins` (
	`user_uuid` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_logins_username_unique` ON `user_logins` (`username`);--> statement-breakpoint
CREATE TABLE `users` (
	`uuid` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`birth_date` integer NOT NULL,
	`group_uuid` text,
	`barcode` text,
	`image_path` text,
	`balance` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_uuid`) REFERENCES `groups`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_barcode_unique` ON `users` (`barcode`);--> statement-breakpoint
CREATE TABLE `cart_items` (
	`uuid` text PRIMARY KEY NOT NULL,
	`product_uuid` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_uuid`) REFERENCES `products`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cart_items_product_uuid_unique` ON `cart_items` (`product_uuid`);--> statement-breakpoint
CREATE TABLE `products` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`price` integer NOT NULL,
	`barcode` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_name_unique` ON `products` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`uuid` text PRIMARY KEY NOT NULL,
	`order_uuid` text NOT NULL,
	`product_uuid` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_uuid`) REFERENCES `orders`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_uuid`) REFERENCES `products`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`amount` integer,
	`transaction_uuid` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_uuid`) REFERENCES `transactions`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_transaction_uuid_unique` ON `orders` (`transaction_uuid`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_uuid` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_uuid`) REFERENCES `users`(`uuid`) ON UPDATE no action ON DELETE no action
);
