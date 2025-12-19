DO $$ BEGIN
 CREATE TYPE "public"."graph_visibility" AS ENUM('private', 'unlisted', 'listed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "graph" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"title" varchar(256) NOT NULL,
	"data" jsonb NOT NULL,
	"visibility" "graph_visibility" DEFAULT 'private' NOT NULL,
	"public_view_enabled" boolean DEFAULT false NOT NULL,
	"public_run_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "graph_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"graph_id" uuid,
	"owner_id" uuid,
	"workflow_id" varchar(128) NOT NULL,
	"status" varchar(16) DEFAULT 'running' NOT NULL,
	"graph" jsonb NOT NULL,
	"outputs" jsonb,
	"statuses" jsonb,
	"files" jsonb,
	"transcripts" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role",
	"email" varchar(64) NOT NULL,
	"password" varchar(64)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "graph" ADD CONSTRAINT "graph_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "graph_run" ADD CONSTRAINT "graph_run_graph_id_graph_id_fk" FOREIGN KEY ("graph_id") REFERENCES "public"."graph"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "graph_run" ADD CONSTRAINT "graph_run_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"node_id" text,
	"kind" varchar(16) NOT NULL,
	"uri" text NOT NULL,
	"filename" text NOT NULL,
	"media_type" text NOT NULL,
	"bytes" bigint NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "file" ADD CONSTRAINT "file_run_id_graph_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."graph_run"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
