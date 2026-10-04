-- ======================================================
-- 🐕 AUDIT LOG ANOMALY DETECTION WATCHDOG (CANARY) 🐕
-- ======================================================
-- This migration implements a daily/hourly watchdog function to analyze
-- audit log volumes per store. If insertion counts deviate significantly
-- from historical baselines (e.g. 500% spike), it fires a security notification.

-- 1. Create the Anomaly Detection Watchdog Function
CREATE OR REPLACE FUNCTION public.check_audit_log_anomaly()
RETURNS TABLE (
  o_store_id UUID,
  o_last_hour_count BIGINT,
  o_historical_hourly_avg NUMERIC,
  o_deviation_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rec record;
  v_historical_count bigint;
  v_historical_avg numeric;
  v_deviation numeric;
  v_baseline_threshold bigint := 50; -- Minimum logs in 1 hour to trigger alert (prevents false positives on low active stores)
  v_alert_multiplier numeric := 5.0;  -- 500% spike (5x the average)
BEGIN
  -- Loop over stores that had activity in the last hour
  FOR v_rec IN 
    SELECT al.store_id, COUNT(*) as current_count
    FROM public.audit_logs al
    WHERE al.created_at >= now() - interval '1 hour'
    GROUP BY al.store_id
  LOOP
    -- Calculate historical count in the 7 days prior to the last hour (167 hours total)
    SELECT COUNT(*) INTO v_historical_count
    FROM public.audit_logs
    WHERE store_id = v_rec.store_id
      AND created_at >= now() - interval '7 days'
      AND created_at < now() - interval '1 hour';

    -- Hourly historical average
    v_historical_avg := COALESCE(v_historical_count::numeric / 167.0, 0.0);

    -- Compute deviation
    IF v_historical_avg > 0 THEN
      v_deviation := (v_rec.current_count::numeric / v_historical_avg);
    ELSE
      -- If there is no historical average but we exceeded the baseline threshold, flag it
      v_deviation := v_rec.current_count::numeric;
    END IF;

    -- Trigger alert if count is high AND deviation is at least 5x the average
    IF v_rec.current_count > v_baseline_threshold AND v_deviation >= v_alert_multiplier THEN
      
      -- Cooldown check: Only write notification if we haven't alerted in the last 1 hour
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE store_id = v_rec.store_id
          AND type = 'security_anomaly'
          AND created_at >= now() - interval '1 hour'
      ) THEN
        -- Insert system security alert notification for the store
        INSERT INTO public.notifications (
          store_id,
          type,
          title,
          message
        ) VALUES (
          v_rec.store_id,
          'security_anomaly',
          '⚠️ Security Alert: Audit Log Surge Detected',
          format('Audit log writes in the last hour (%s) exceeded the 7-day average hourly baseline (%s) by %s%%. Possible brute-force or log-flooding attack.', 
                 v_rec.current_count, round(v_historical_avg, 2), round(v_deviation * 100, 2))
        );
      END IF;

      -- Return output row
      o_store_id := v_rec.store_id;
      o_last_hour_count := v_rec.current_count;
      o_historical_hourly_avg := round(v_historical_avg, 2);
      o_deviation_percentage := round(v_deviation * 100, 2);
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- 2. Optional: Set up pg_cron if available (handles automatic background execution)
-- In production, the Supabase scheduler or an external pg_cron job can invoke this.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the anomaly checker to run hourly
SELECT cron.schedule(
    'audit-log-anomaly-check',
    '0 * * * *', -- At the start of every hour
    'SELECT public.check_audit_log_anomaly()'
);
