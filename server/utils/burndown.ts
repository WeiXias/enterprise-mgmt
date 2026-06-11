/**
 * Compute burndown chart data from a set of tasks.
 *
 * actual = tasks that exist and remain open on each day.
 * ideal  = linear interpolation from total tasks (start) to 0 (end).
 */
export function computeBurndown(
  tasks: { status: string; createdAt: string; completedAt?: string }[],
  startDate: string,
  endDate: string,
): { days: string[]; actual: number[]; ideal: number[] } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // --- Generate the day axis -------------------------------------------------
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    // YYYY-MM-DD
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  const total = tasks.length;
  const lastIdx = days.length - 1;

  const actual: number[] = [];
  const ideal: number[] = [];

  for (let i = 0; i < days.length; i++) {
    // --- ideal line ----------------------------------------------------------
    if (lastIdx <= 0) {
      ideal.push(0);
    } else {
      // i = 0 → total, i = lastIdx → 0
      ideal.push(Math.round((total * (1 - i / lastIdx)) * 100) / 100);
    }

    // --- actual line ---------------------------------------------------------
    // end of day (23:59:59.999)
    const dayEnd = new Date(days[i]!);
    dayEnd.setHours(23, 59, 59, 999);

    let openCount = 0;
    for (const t of tasks) {
      const created = new Date(t.createdAt);
      if (created > dayEnd) continue; // not yet in scope

      if (t.status !== "completed") {
        openCount++;
        continue;
      }

      // status === "completed" — check whether it completed *after* this day
      if (t.completedAt) {
        const completed = new Date(t.completedAt);
        if (completed > dayEnd) openCount++;
      }
      // If completed but no completedAt timestamp, conservatively treat as done.
    }
    actual.push(openCount);
  }

  return { days, actual, ideal };
}
