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