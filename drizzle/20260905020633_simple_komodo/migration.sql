CREATE TYPE "class_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "classes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "classes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer NOT NULL,
	"teacher_id" text NOT NULL,
	"invite_code" text NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"banner_cld_pub_id" text,
	"banner_url" text,
	"description" text,
	"capacity" integer DEFAULT 50 NOT NULL,
	"status" "class_status" DEFAULT 'active'::"class_status" NOT NULL,
	"schedules" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "enrollments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"student_id" text NOT NULL,
	"class_id" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "classes_subjectId_idx" ON "classes" ("subject_id");--> statement-breakpoint
CREATE INDEX "classes_teacherId_idx" ON "classes" ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_studentId_classId_uidx" ON "enrollments" ("student_id","class_id");--> statement-breakpoint
CREATE INDEX "enrollments_studentId_idx" ON "enrollments" ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_classId_idx" ON "enrollments" ("class_id");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_subject_id_subjects_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_user_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_user_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE;