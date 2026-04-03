'use client';
import { useState, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Label } from './label';

interface Props {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  maxItems?: number;
  error?: string;
}

export function StringListEditor({ label, placeholder, items, onChange, maxItems = Infinity, error }: Props) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setDraft('');
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div>
      <Label>{label} <span className="text-red-500">*</span></Label>
      <div className="mt-1 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <span className="flex-1 text-sm text-gray-800">{item}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {items.length < maxItems ? (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`flex-1 ${error && items.length === 0 ? 'border-red-400' : ''}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={add}
              disabled={!draft.trim()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Adaugă
            </Button>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Maxim {maxItems} elemente.</p>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
