'use client';

import { X } from 'lucide-react';
import type { OverlayInteraction } from '@/types';

interface OverlayCardProps {
  interaction: OverlayInteraction;
  onDismiss: () => void;
}

export default function OverlayCard({ interaction, onDismiss }: OverlayCardProps) {
  return (
    <div data-testid="overlay-card" className="absolute bottom-4 left-4 right-4 z-20 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-xl bg-white/95 backdrop-blur shadow-2xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-bold text-gray-800 text-sm">{interaction.title}</h4>
          <button onClick={onDismiss} aria-label="Închide" className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">{interaction.text}</p>
        {interaction.ctaLabel && interaction.ctaHref && (
          <a href={interaction.ctaHref} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 transition">
            {interaction.ctaLabel}
          </a>
        )}
      </div>
    </div>
  );
}
