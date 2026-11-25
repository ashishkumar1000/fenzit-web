/** Customers-page dropdown and column words, shared by the filter bar, the
 *  pager and the CSV. The buckets are the disjoint job-history split (new =
 *  no jobs, single = one, repeat = two or more), so the words stay plain. */
export const BUCKET_WORDS: Record<string, string> = {
  all: "All",
  new: "New",
  single: "One Job",
  repeat: "Repeat Customers",
};

export const CUSTOMER_SORT_WORDS: Record<string, string> = {
  created_new: "Newest Added",
  created_old: "Oldest Added",
  name_az: "Name (A to Z)",
  name_za: "Name (Z to A)",
  recent_activity: "Recently Active",
};
