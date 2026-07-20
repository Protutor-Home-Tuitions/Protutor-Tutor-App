-- ═══════════════════════════════════════════════════════════════════
-- ProTutor — WATI Notification Queue System
-- Replaces unreliable setImmediate WATI calls with DB queue + cron
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id UUID NOT NULL,
  enq_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',       -- pending | processing | sent | failed
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error TEXT
);

-- Index for fast pending lookups
CREATE INDEX IF NOT EXISTS idx_notif_queue_status ON notification_queue (status, created_at)
WHERE status = 'pending';

-- Step 2: Trigger function — queue notification on attendance INSERT
CREATE OR REPLACE FUNCTION queue_attendance_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue for non-demo, non-admin attendance
  IF NEW."isDemo" IS NOT TRUE AND NEW."byAdmin" IS NOT TRUE THEN
    BEGIN
      INSERT INTO notification_queue (attendance_id, enq_id)
      VALUES (NEW.id, NEW."enqId");
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'queue_attendance_notification failed: %', SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on attendance table
DROP TRIGGER IF EXISTS trg_queue_att_notification ON attendance;
CREATE TRIGGER trg_queue_att_notification
AFTER INSERT ON attendance
FOR EACH ROW
EXECUTE FUNCTION queue_attendance_notification();

-- Step 4: pg_cron job — calls API every 2 minutes
-- IMPORTANT: Replace YOUR_CRON_SECRET with a strong random string
-- Generate one: SELECT gen_random_uuid()::text
SELECT cron.schedule(
  'process-wati-notifications',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://api.protutor.co.in/api/attendance/notifications/process',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "REPLACE_WITH_SECRET"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
