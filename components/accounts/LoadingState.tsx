import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Loading your accounts and assets...</p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Syncing with PostgreSQL database</p>
    </div>
  );
}