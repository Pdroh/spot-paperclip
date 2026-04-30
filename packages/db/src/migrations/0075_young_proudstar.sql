CREATE TABLE "project_agent_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"key" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"markdown" text NOT NULL,
	"source_type" text DEFAULT 'local_path' NOT NULL,
	"source_locator" text,
	"source_ref" text,
	"trust_level" text DEFAULT 'markdown_only' NOT NULL,
	"compatibility" text DEFAULT 'compatible' NOT NULL,
	"file_inventory" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_adapter_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"adapter_type" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"encrypted_credential" text NOT NULL,
	"iv" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_agent_assignments" ADD CONSTRAINT "project_agent_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_agent_assignments" ADD CONSTRAINT "project_agent_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_agent_assignments" ADD CONSTRAINT "project_agent_assignments_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_agent_assignments_project_agent_unique_idx" ON "project_agent_assignments" USING btree ("project_id","agent_id");--> statement-breakpoint
CREATE INDEX "project_agent_assignments_agent_idx" ON "project_agent_assignments" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "project_agent_assignments_project_idx" ON "project_agent_assignments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_agent_assignments_company_idx" ON "project_agent_assignments" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_memberships_project_user_unique_idx" ON "project_memberships" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_memberships_user_status_idx" ON "project_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "project_memberships_project_status_idx" ON "project_memberships" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "project_memberships_company_idx" ON "project_memberships" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_skills_project_key_idx" ON "project_skills" USING btree ("project_id","key");--> statement-breakpoint
CREATE INDEX "project_skills_project_name_idx" ON "project_skills" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "project_skills_company_idx" ON "project_skills" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_adapter_credentials_user_adapter_unique_idx" ON "user_adapter_credentials" USING btree ("user_id","adapter_type");--> statement-breakpoint
CREATE INDEX "user_adapter_credentials_user_idx" ON "user_adapter_credentials" USING btree ("user_id");