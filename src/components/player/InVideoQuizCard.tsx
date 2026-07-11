'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { QuizInteraction } from '@/types';

interface InVideoQuizCardProps {
  interaction: QuizInteraction;
  onPassed: () => void;
}

export default function InVideoQuizCard({ interaction, onPassed }: InVideoQuizCardProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState(false);

  const toggle = (optIdx: number) => {
    setWrong(false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(optIdx) ? next.delete(optIdx) : next.add(optIdx);
      return next;
    });
  };
  const handleCheck = () => {
    const correct = new Set(interaction.correctIndexes ?? []);
    const ok = selected.size === correct.size && [...selected].every((i) => correct.has(i));
    ok ? onPassed() : setWrong(true);
  };
  const handleRetry = () => { setSelected(new Set()); setWrong(false); };

  return (
    <div data-testid="quiz-overlay" className="w-full max-w-lg rounded-xl bg-white shadow-2xl border p-6">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">❓</span>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Întrebare</h3>
          <p className="text-xs text-gray-400 mt-0.5">Răspunde corect pentru a continua videoclipul</p>
        </div>
      </div>
      <p className="font-semibold text-gray-800 mb-1">{interaction.question}</p>
      <p className="text-xs text-gray-400 mb-3">Selectează toate răspunsurile corecte</p>
      <div className="space-y-2">
        {interaction.options.map((opt, oIdx) => {
          const isSel = selected.has(oIdx);
          return (
            <button
              key={oIdx}
              data-testid={`quiz-option-${oIdx}`}
              onClick={() => toggle(oIdx)}
              className={`w-full text-left flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition cursor-pointer hover:bg-blue-50 ${isSel ? 'border-blue-500 bg-blue-50 font-medium' : 'border-gray-200 bg-white'}`}
            >
              <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${isSel ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                {isSel ? '✓' : ''}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {wrong && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
            <XCircle className="w-4 h-4" /> Răspuns greșit
          </div>
          {interaction.explanation && (
            <p data-testid="quiz-explanation" className="text-sm text-red-600 mt-1">{interaction.explanation}</p>
          )}
        </div>
      )}
      <div className="mt-5 flex gap-3">
        {!wrong ? (
          <Button data-testid="quiz-submit" onClick={handleCheck} disabled={selected.size === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle className="w-4 h-4 mr-1.5" /> Verifică răspunsul
          </Button>
        ) : (
          <Button data-testid="quiz-retry" variant="outline" onClick={handleRetry} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Încearcă din nou
          </Button>
        )}
      </div>
    </div>
  );
}
