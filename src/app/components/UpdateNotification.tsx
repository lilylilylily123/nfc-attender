'use client';

import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateInfo {
  current: string;
  latest: string;
  notes?: string;
}

export function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unlistenAvailable = listen<UpdateInfo>('update-available', (event) => {
      setUpdateInfo(event.payload);
    });

    const unlistenReady = listen('update-ready', () => {
      setReady(true);
    });

    return () => {
      unlistenAvailable.then((fn) => fn());
      unlistenReady.then((fn) => fn());
    };
  }, []);

  if (!updateInfo || dismissed) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <svg
              className="w-6 h-6 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Update Available
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Version {updateInfo.latest} is now available
              <span className="text-gray-400"> (current: {updateInfo.current})</span>
            </p>
            {updateInfo.notes && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {updateInfo.notes}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {ready ? (
            <button
              onClick={() => relaunch()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Restart Now
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              Downloading...
            </span>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
