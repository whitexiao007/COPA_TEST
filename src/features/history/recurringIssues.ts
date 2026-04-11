import { type InspectionItem } from '@/src/db/schema';

/**
 * Groups items by templateItemId, counts 'fail' statuses, returns IDs where count >= threshold.
 * @param itemsByInspection ordered newest-first, up to last 5
 * @param threshold default 3
 */
export function getRecurringIssueIds(
  itemsByInspection: InspectionItem[][],
  threshold: number = 3
): Set<string> {
  const failCounts: Record<string, number> = {};

  itemsByInspection.forEach((items) => {
    items.forEach((item) => {
      if (item.status === 'fail') {
        failCounts[item.templateItemId] = (failCounts[item.templateItemId] || 0) + 1;
      }
    });
  });

  const recurringIds = new Set<string>();
  Object.entries(failCounts).forEach(([id, count]) => {
    if (count >= threshold) {
      recurringIds.add(id);
    }
  });

  return recurringIds;
}
