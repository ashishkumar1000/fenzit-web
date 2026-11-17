/** Customers-page dropdown and column words, shared by the filter bar, the
 *  pager and the CSV. The buckets are the disjoint job-history split (new =
 *  no jobs, single = one, repeat = two or more), so the words stay plain. */
export const BUCKET_WORDS: Record<string, string> = {
  all: "All",
  new: "New",
  single: "Single job",
  repeat: "Repeat",
};

export const CUSTOMER_SORT_WORDS: Record<string, string> = {
  created_new: "Added (newest)",
  created_old: "Added (oldest)",
  name_az: "Name (A–Z)",
  name_za: "Name (Z–A)",
  recent_activity: "Recent activity",
};
