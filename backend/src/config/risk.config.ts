export const RiskConfig = {
  // Inactivity Thresholds (Days without any platform action or login)
  INACTIVITY_THRESHOLD_DAYS: 10,
  HIGH_INACTIVITY_THRESHOLD_DAYS: 20,

  // Course Stagnation Thresholds (Enrolled & started course with progress between 1% and 99% with no lesson progress)
  COURSE_STAGNATION_THRESHOLD_DAYS: 10,

  // Quiz Failure Thresholds (Consecutive failed attempts without passing)
  QUIZ_FAILURE_THRESHOLD: 3,

  // Assessment Score Thresholds (Recent average score percentage)
  LOW_SCORE_THRESHOLD: 50.0,

  // Graded assessment sample window
  RECENT_ACTIVITIES_WINDOW: 5,

  // Notification deduplication & cooldown in days
  NOTIFICATION_COOLDOWN_DAYS: 7,

  // Background scheduler interval (e.g., runs analysis every 6 hours)
  SCHEDULER_INTERVAL_HOURS: 6,
};
