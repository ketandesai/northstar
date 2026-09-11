import React from 'react';

interface AccountsSectionProps {
  title: string;
  count: number;
  singular: string;
  plural: string;
  emptyMessage: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function AccountsSection({
  title,
  count,
  singular,
  plural,
  emptyMessage,
  action,
  children,
}: AccountsSectionProps) {
  const countLabel = `${count} ${count === 1 ? singular : plural}`;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">{title}</h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{countLabel}</span>
        </div>
        {action && <div>{action}</div>}
      </div>

      {count === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">{children}</div>
      )}
    </div>
  );
}