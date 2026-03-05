/**
 * Intent score calculation for investor analytics.
 * Surfaces investors most likely to commit based on breadth, depth, and recency.
 */

const MAX_SECONDS_PER_VIEW = 20 * 60; // 20 min cap per tab view (prevents idle-tab inflation)
const RETURN_VISIT_BONUS = 3; // points per return session (beyond the first visit)
export const SESSION_GAP_MINUTES = 30; // used by both scoring and notifications

// Recency decay: recent engagement is more predictive
const RECENCY_FACTORS = {
  last7Days: 1.0,
  days8to30: 0.7,
  older: 0.4,
};

export function getRecencyFactor(lastActiveDate) {
  if (!lastActiveDate) return RECENCY_FACTORS.older;
  const now = new Date();
  const last = new Date(lastActiveDate);
  const daysSince = (now - last) / (24 * 60 * 60 * 1000);
  if (daysSince <= 7) return RECENCY_FACTORS.last7Days;
  if (daysSince <= 30) return RECENCY_FACTORS.days8to30;
  return RECENCY_FACTORS.older;
}

export function getSuggestedNextStep(intentScore) {
  if (intentScore >= 50) return "Schedule call";
  if (intentScore >= 20) return "Follow-up email";
  return "Wait for signal";
}

/**
 * Compute raw intent score from records (before recency decay).
 * Uses capped time per view, return-visit bonus.
 */
export function computeRawIntentScore(records, tabWeights, groupIntoSessions) {
  if (!records || records.length === 0) return 0;

  const visits = records.length;

  // Build tabMap with capped seconds per view (prevents idle-tab inflation)
  const tabMap = {};
  for (const r of records) {
    const cappedSeconds = Math.min(r.time_spent_seconds, MAX_SECONDS_PER_VIEW);
    if (!tabMap[r.tab_id]) tabMap[r.tab_id] = { count: 0, seconds: 0 };
    tabMap[r.tab_id].count += 1;
    tabMap[r.tab_id].seconds += cappedSeconds;
  }

  let weightedMinutes = 0;
  for (const [tabId, data] of Object.entries(tabMap)) {
    weightedMinutes += (data.seconds / 60) * (tabWeights[tabId] || 1);
  }

  const sessions = groupIntoSessions(records);
  const returnBonus = Math.max(0, sessions.length - 1) * RETURN_VISIT_BONUS;

  return Math.round(visits * 2 + weightedMinutes + returnBonus);
}

/**
 * Compute intent score for a time window (for "heating up" comparison).
 */
export function computeIntentForWindow(records, tabWeights, groupIntoSessions, windowStart, windowEnd) {
  const filtered = records.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= windowStart && t < windowEnd;
  });
  return computeRawIntentScore(filtered, tabWeights, groupIntoSessions);
}

/**
 * Check if investor is "heating up" — engagement in last 7 days exceeds prior week.
 */
export function isHeatingUp(records, tabWeights, groupIntoSessions) {
  if (!records || records.length < 2) return false;

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  const last7Start = now - sevenDaysMs;
  const prev7Start = now - fourteenDaysMs;

  const intentLast7 = computeIntentForWindow(
    records,
    tabWeights,
    groupIntoSessions,
    last7Start,
    now
  );
  const intentPrev7 = computeIntentForWindow(
    records,
    tabWeights,
    groupIntoSessions,
    prev7Start,
    last7Start
  );

  // Heating up = had meaningful recent activity and it's higher than prior week
  return intentLast7 >= 10 && intentLast7 > intentPrev7 + 10;
}

/**
 * Group page_view records into sessions (SESSION_GAP_MINUTES gap = new session).
 */
export function groupIntoSessions(records) {
  const sorted = [...records].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const sessions = [];
  let current = [];

  for (const record of sorted) {
    if (current.length === 0) {
      current.push(record);
    } else {
      const last = current[current.length - 1];
      const gapMinutes = (new Date(record.created_at) - new Date(last.created_at)) / 60000;
      if (gapMinutes > SESSION_GAP_MINUTES) {
        sessions.push(current);
        current = [record];
      } else {
        current.push(record);
      }
    }
  }
  if (current.length > 0) sessions.push(current);
  return sessions;
}
