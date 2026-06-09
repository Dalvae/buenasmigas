CREATE TYPE "public"."accion_auditoria" AS ENUM('crear', 'editar', 'borrar');--> statement-breakpoint
CREATE TYPE "public"."turno" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" text,
	"accion" "accion_auditoria" NOT NULL,
	"usuario_id" text,
	"detalle" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config_formula" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" double precision NOT NULL,
	"descripcion" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "envasado_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"registro_id" integer NOT NULL,
	"tipo_envasado_id" integer NOT NULL,
	"pedido" integer DEFAULT 0 NOT NULL,
	"real" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operario" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pnc_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"registro_id" integer NOT NULL,
	"descripcion" text,
	"unidades" double precision DEFAULT 0 NOT NULL,
	"kilos" double precision DEFAULT 0 NOT NULL,
	"bandejas" double precision DEFAULT 0 NOT NULL,
	"carros" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registro" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"turno" "turno" NOT NULL,
	"operario_id" integer NOT NULL,
	"batch_real" integer DEFAULT 0 NOT NULL,
	"batch_prog" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tipo_envasado" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'operario' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envasado_item" ADD CONSTRAINT "envasado_item_registro_id_registro_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envasado_item" ADD CONSTRAINT "envasado_item_tipo_envasado_id_tipo_envasado_id_fk" FOREIGN KEY ("tipo_envasado_id") REFERENCES "public"."tipo_envasado"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pnc_item" ADD CONSTRAINT "pnc_item_registro_id_registro_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro" ADD CONSTRAINT "registro_operario_id_operario_id_fk" FOREIGN KEY ("operario_id") REFERENCES "public"."operario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro" ADD CONSTRAINT "registro_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "envasado_item_registro_idx" ON "envasado_item" USING btree ("registro_id");--> statement-breakpoint
CREATE INDEX "pnc_item_registro_idx" ON "pnc_item" USING btree ("registro_id");--> statement-breakpoint
CREATE UNIQUE INDEX "registro_fecha_turno_idx" ON "registro" USING btree ("fecha","turno");--> statement-breakpoint
CREATE INDEX "registro_fecha_idx" ON "registro" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");