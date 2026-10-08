CREATE TYPE "public"."canal_notification" AS ENUM('email', 'sms', 'portail');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('administrateur', 'direction', 'scolarite', 'finance', 'concours', 'enseignant', 'etudiant', 'candidat');--> statement-breakpoint
CREATE TYPE "public"."statut_notification" AS ENUM('en_attente', 'envoyee', 'echec');--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annee_academique" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libelle" text NOT NULL,
	"date_debut" date NOT NULL,
	"date_fin" date NOT NULL,
	"est_courante" boolean DEFAULT false NOT NULL,
	"attribue_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "annee_academique_libelle_unique" UNIQUE("libelle")
);
--> statement-breakpoint
CREATE TABLE "fichier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cle_r_2" text NOT NULL,
	"nom_original" text NOT NULL,
	"type_mime" text NOT NULL,
	"taille" bigint NOT NULL,
	"empreinte_sha256" text NOT NULL,
	"categorie" text NOT NULL,
	"proprietaire_id" text,
	"depose_par" text,
	"attribue_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fichier_cleR2_unique" UNIQUE("cle_r_2")
);
--> statement-breakpoint
CREATE TABLE "filiere" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"libelle" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"attribue_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "filiere_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "journal_audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"horodatage" timestamp with time zone DEFAULT now() NOT NULL,
	"acteur_id" text,
	"action" text NOT NULL,
	"entite" text NOT NULL,
	"entite_id" text,
	"details" jsonb,
	"adresse_ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "niveau" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"libelle" text NOT NULL,
	"ordre" smallint NOT NULL,
	"attribue_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "niveau_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destinataire_id" text,
	"canal" "canal_notification" NOT NULL,
	"adresse" text,
	"sujet" text NOT NULL,
	"contenu" text NOT NULL,
	"statut" "statut_notification" DEFAULT 'en_attente' NOT NULL,
	"tentatives" smallint DEFAULT 0 NOT NULL,
	"derniere_erreur" text,
	"attribue_le" timestamp with time zone DEFAULT now() NOT NULL,
	"envoyee_le" timestamp with time zone,
	"lue_le" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "role_utilisateur" (
	"utilisateur_id" text NOT NULL,
	"role" "role" NOT NULL,
	"attribue_par" text,
	"attribue_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_utilisateur_utilisateur_id_role_pk" PRIMARY KEY("utilisateur_id","role")
);
--> statement-breakpoint
CREATE TABLE "salle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"libelle" text NOT NULL,
	"batiment" text,
	"capacite" integer,
	"active" boolean DEFAULT true NOT NULL,
	"attribue_le" timestamp with time zone DEFAULT now() NOT NULL,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salle_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichier" ADD CONSTRAINT "fichier_proprietaire_id_auth_user_id_fk" FOREIGN KEY ("proprietaire_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fichier" ADD CONSTRAINT "fichier_depose_par_auth_user_id_fk" FOREIGN KEY ("depose_par") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_destinataire_id_auth_user_id_fk" FOREIGN KEY ("destinataire_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_utilisateur" ADD CONSTRAINT "role_utilisateur_utilisateur_id_auth_user_id_fk" FOREIGN KEY ("utilisateur_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_utilisateur" ADD CONSTRAINT "role_utilisateur_attribue_par_auth_user_id_fk" FOREIGN KEY ("attribue_par") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_account_user_id_index" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_user_id_index" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_index" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "annee_academique_courante_unique" ON "annee_academique" USING btree ("est_courante") WHERE "annee_academique"."est_courante";--> statement-breakpoint
CREATE INDEX "fichier_proprietaire_id_index" ON "fichier" USING btree ("proprietaire_id");--> statement-breakpoint
CREATE INDEX "journal_audit_entite_entite_id_index" ON "journal_audit" USING btree ("entite","entite_id");--> statement-breakpoint
CREATE INDEX "journal_audit_acteur_id_index" ON "journal_audit" USING btree ("acteur_id");--> statement-breakpoint
CREATE INDEX "journal_audit_horodatage_index" ON "journal_audit" USING btree ("horodatage");--> statement-breakpoint
CREATE INDEX "notification_destinataire_id_attribue_le_index" ON "notification" USING btree ("destinataire_id","attribue_le");--> statement-breakpoint
CREATE INDEX "notification_statut_index" ON "notification" USING btree ("statut");