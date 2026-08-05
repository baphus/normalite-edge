-- CreateIndex
CREATE INDEX "conferences_start_at_idx" ON "conferences"("start_at" DESC);

-- CreateIndex
CREATE INDEX "conferences_host_id_idx" ON "conferences"("host_id");

-- CreateIndex
CREATE INDEX "exams_status_schedule_start_idx" ON "exams"("status", "schedule_start" ASC);

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
