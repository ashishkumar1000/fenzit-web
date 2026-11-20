/** Jobs-page dropdown, chip and column words, shared by the filter bar, the
 *  table, the export and the CSV. The statuses are the job lifecycle's six
 *  values plus the all-jobs chip; the words stay plain. */
export const JOB_STATUS_WORDS: Record<string, string> = {
  "": "All",
  scheduled: "Scheduled",
  in_progress: "In progress",
  pending_approval: "Pending approval",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export const JOB_PRIORITY_WORDS: Record<string, string> = {
  "": "All",
  normal: "Normal",
  urgent: "Urgent",
};

export const JOB_SORT_WORDS: Record<string, string> = {
  latest: "Latest",
  soonest: "Soonest",
};
