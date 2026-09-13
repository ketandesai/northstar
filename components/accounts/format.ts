export const formatCurrency = (amount: number | null, currency: string = 'USD') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
};

export const formatTimestamp = (isoDate: string) => {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return '';
  return then.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const RELATIVE_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Infinity, unit: 'year' },
];

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export const formatRelativeTime = (isoDate: string): string => {
  const then = new Date(isoDate);
  if (Number.isNaN(then.getTime())) return '';
  let diffMs = then.getTime() - Date.now();
  for (const { amount, unit } of RELATIVE_DIVISIONS) {
    if (Math.abs(diffMs) < amount) {
      return relativeFormatter.format(Math.round(diffMs), unit);
    }
    diffMs /= amount;
  }
  return '';
};