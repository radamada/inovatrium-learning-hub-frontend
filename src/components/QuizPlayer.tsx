'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Lesson, QuizResult } from '@/types';

interface QuizPlayerProps {
  lesson: Lesson;
  courseId: string;
  onPassed: () => void; // called after a passing attempt so parent can refresh progress
}

export default function QuizPlayer({ lesson, courseId, onPassed }: QuizPlayerProps) {
  const questions = lesson.questions ?? [];
  const [selected, setSelected] = useState<(number | null)[]>(
    Array(questions.length).fill(null),
  );
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = selected.every((s) => s !== null);

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (result) return; // locked after submit
    setSelected((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    try {
      const { data } = await api.post<QuizResult>(
        `/enrollments/${courseId}/quiz/${lesson._id}/submit`,
        { answers: selected },
      );
      setResult(data);
      if (data.passed) {
        toast.success(`Felicitări! Ai obținut ${data.score}%`);
        onPassed();
      }
    } catch {
      toast.error('Eroare la trimiterea răspunsurilor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSelected(Array(questions.length).fill(null));
    setResult(null);
  };

  if (questions.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        Acest quiz nu are întrebări definite încă.
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">📝</span>
        <div>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {questions.length} {questions.length === 1 ? 'întrebare' : 'întrebări'} · minimum 90% pentru a trece
          </p>
        </div>
      </div>

      {/* Result card */}
      {result && (
        <div
          className={`mb-6 rounded-xl p-5 border ${
            result.passed
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {result.passed ? (
              <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
            )}
            <div>
              <p className={`text-lg font-bold ${result.passed ? 'text-green-800' : 'text-red-800'}`}>
                {result.passed ? 'Felicitări! Ai trecut quiz-ul!' : 'Nu ai trecut quiz-ul'}
              </p>
              <p className={`text-sm mt-0.5 ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                Scor: {result.score}% &nbsp;·&nbsp; {result.correctAnswers}/{result.totalQuestions} răspunsuri corecte
              </p>
              {!result.passed && (
                <p className="text-sm text-red-600 mt-1">
                  Trebuie minimum 90% pentru a continua.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="font-semibold text-gray-800 mb-3">
              <span className="text-indigo-600 mr-2">{qIdx + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oIdx) => {
                const isSelected = selected[qIdx] === oIdx;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelect(qIdx, oIdx)}
                    disabled={!!result}
                    className={`w-full text-left flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition
                      ${result ? 'cursor-default' : 'cursor-pointer hover:bg-indigo-50'}
                      ${isSelected && !result ? 'border-indigo-500 bg-indigo-50 font-medium' : ''}
                      ${isSelected && result ? (result.passed ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : ''}
                      ${!isSelected ? 'border-gray-200 bg-white' : ''}
                    `}
                  >
                    <span
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs
                        ${isSelected && !result ? 'border-indigo-500 bg-indigo-500 text-white' : ''}
                        ${isSelected && result ? (result.passed ? 'border-green-500 bg-green-500 text-white' : 'border-red-400 bg-red-400 text-white') : ''}
                        ${!isSelected ? 'border-gray-300' : ''}
                      `}
                    >
                      {isSelected ? String.fromCharCode(65 + oIdx) : ''}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        {!result && (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitting ? 'Se verifică...' : 'Trimite răspunsurile'}
          </Button>
        )}
        {result && !result.passed && (
          <Button variant="outline" onClick={handleRetry} className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Încearcă din nou
          </Button>
        )}
        {result && result.passed && (
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1 font-medium">
            <CheckCircle className="w-4 h-4" />
            Quiz finalizat! Continuă cu lecția următoare.
          </p>
        )}
      </div>
    </div>
  );
}
