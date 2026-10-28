// Mock savings maths for the pricing calculator. Not a real forecast: each figure is a fixed
// sample rate, so the slider shows the shape of the estimate and nothing more.

export const HOURS_SAVED_PER_TECHNICIAN = 2.48;

/** The plan a headcount falls into. The bands match the plan cards on the page. */
export function tierForMembers(members: number): string {
  if (members <= 15) return "Starter";
  if (members <= 75) return "Growth";
  return "Large teams";
}

/** Admin hours saved per month by automated timesheets, rounded to whole hours. */
export function hoursSavedPerMonth(members: number): number {
  return Math.round(members * HOURS_SAVED_PER_TECHNICIAN);
}
