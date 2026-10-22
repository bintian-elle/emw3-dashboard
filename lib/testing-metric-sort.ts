export type MetricSort = { key: string; direction: 'ascending' | 'descending' } | null;
export type MetricSortValues = Record<string, number | null | undefined>;
export function nextMetricSort(current: MetricSort, key: string): MetricSort {
  return current?.key !== key ? { key, direction: 'descending' } : current.direction === 'descending' ? { key, direction: 'ascending' } : null;
}
export function sortMetricRows<T>(rows: readonly T[], sort: MetricSort, values: (row: T) => MetricSortValues): T[] {
  if (!sort) return [...rows];
  return rows.map((row, index) => ({ row, index })).sort((a, b) => {
    const left = values(a.row)[sort.key], right = values(b.row)[sort.key];
    const leftMissing = left == null || !Number.isFinite(left), rightMissing = right == null || !Number.isFinite(right);
    if (leftMissing || rightMissing) return leftMissing === rightMissing ? a.index - b.index : leftMissing ? 1 : -1;
    return (sort.direction === 'ascending' ? left! - right! : right! - left!) || a.index - b.index;
  }).map(item => item.row);
}
