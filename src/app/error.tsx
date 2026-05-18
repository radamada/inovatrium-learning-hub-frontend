'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Failed to load chunk');

  // ChunkLoadErrors happen in dev when Turbopack/webpack rebuilds and old chunk
  // hashes become invalid. Auto-reload recovers instantly without user action.
  useEffect(() => {
    if (isChunkError) {
      window.location.reload();
    }
  }, [isChunkError]);

  if (isChunkError) {
    // Show nothing while auto-reloading
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Ceva a mers greșit
        </h1>
        <p className="text-muted-foreground max-w-sm">
          A apărut o eroare neașteptată. Încearcă să reîncarci pagina.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Încearcă din nou
        </button>
      </div>
    </div>
  );
}
