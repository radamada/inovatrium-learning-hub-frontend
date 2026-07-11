'use client';

import { useRef, useState } from 'react';
import { Trash2, Plus, HelpCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ClipItem, InteractionItem, QuizInteraction, OverlayInteraction } from './types';
import { uuid } from './types';

interface Props { clip: ClipItem; onChange: (clip: ClipItem) => void; previewUrl?: string; }
const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function TimelineEditor({ clip, onChange, previewUrl }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addType, setAddType] = useState<'quiz' | 'overlay'>('quiz');
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<string | null>(null);
  const movedRef = useRef(false);
  const duration = Math.max(clip.duration, 1);

  const xToSec = (clientX: number): number => {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * duration);
  };
  const commit = (interactions: InteractionItem[]) => onChange({ ...clip, interactions });
  const patch = (id: string, p: Partial<Omit<QuizInteraction, 'type'> & Omit<OverlayInteraction, 'type'>>) =>
    commit(clip.interactions.map((it) => (it.id === id ? ({ ...it, ...p } as InteractionItem) : it)));
  const addMarker = (atSec: number) => {
    const id = uuid();
    const item: InteractionItem = addType === 'quiz'
      ? { id, type: 'quiz', atSec, question: '', options: ['', ''], correctIndexes: [0], explanation: '' }
      : { id, type: 'overlay', atSec, untilSec: Math.min(atSec + 5, duration), title: '', text: '' };
    commit([...clip.interactions, item].sort((a, b) => a.atSec - b.atSec));
    setSelectedId(id);
  };
  const removeMarker = (id: string) => { commit(clip.interactions.filter((it) => it.id !== id)); if (selectedId === id) setSelectedId(null); };

  const onTrackClick = (e: React.MouseEvent) => { if (movedRef.current) { movedRef.current = false; return; } addMarker(xToSec(e.clientX)); };
  const onMarkerPointerDown = (e: React.PointerEvent, id: string) => { e.stopPropagation(); draggingRef.current = id; movedRef.current = false; trackRef.current?.setPointerCapture(e.pointerId); setSelectedId(id); };
  const onTrackPointerMove = (e: React.PointerEvent) => { const id = draggingRef.current; if (!id) return; movedRef.current = true; patch(id, { atSec: xToSec(e.clientX) }); };
  const onTrackPointerUp = (e: React.PointerEvent) => { if (draggingRef.current) { trackRef.current?.releasePointerCapture(e.pointerId); draggingRef.current = null; commit([...clip.interactions].sort((a, b) => a.atSec - b.atSec)); } };

  const addOption = (q: QuizInteraction) => { if (q.options.length >= 10) return; patch(q.id, { options: [...q.options, ''] }); };
  const removeOption = (q: QuizInteraction, idx: number) => {
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, i) => i !== idx);
    let correctIndexes = q.correctIndexes.filter((i) => i !== idx).map((i) => (i > idx ? i - 1 : i));
    if (correctIndexes.length === 0) correctIndexes = [0];
    patch(q.id, { options, correctIndexes });
  };
  const setOption = (q: QuizInteraction, idx: number, value: string) => { const options = [...q.options]; options[idx] = value; patch(q.id, { options }); };
  const toggleCorrect = (q: QuizInteraction, idx: number) => {
    const has = q.correctIndexes.includes(idx);
    const next = has ? q.correctIndexes.filter((i) => i !== idx) : [...q.correctIndexes, idx];
    if (next.length === 0) return;
    patch(q.id, { correctIndexes: next.sort((a, b) => a - b) });
  };
  const selected = clip.interactions.find((it) => it.id === selectedId) ?? null;

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3" data-testid="timeline-editor">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Click pe bară pentru a adăuga:</span>
        <div className="inline-flex rounded-md border overflow-hidden">
          <button type="button" onClick={() => setAddType('quiz')} className={`px-2 py-1 flex items-center gap-1 ${addType === 'quiz' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}><HelpCircle className="w-3 h-3" /> Quiz</button>
          <button type="button" onClick={() => setAddType('overlay')} className={`px-2 py-1 flex items-center gap-1 ${addType === 'overlay' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}><MessageSquare className="w-3 h-3" /> Overlay</button>
        </div>
        <span className="ml-auto text-gray-400">Durată: {fmt(duration)}</span>
      </div>
      {previewUrl && <video src={previewUrl} muted controls className="w-full max-h-56 rounded bg-black" data-testid="clip-preview" />}
      <div ref={trackRef} onClick={onTrackClick} onPointerMove={onTrackPointerMove} onPointerUp={onTrackPointerUp} className="relative h-10 rounded bg-gray-100 border cursor-crosshair select-none" data-testid="timeline-track">
        {clip.interactions.map((it) => {
          const leftPct = (Math.min(it.atSec, duration) / duration) * 100;
          const isQuiz = it.type === 'quiz';
          return (
            <button key={it.id} type="button" onPointerDown={(e) => onMarkerPointerDown(e, it.id)} onClick={(e) => { e.stopPropagation(); setSelectedId(it.id); }} style={{ left: `${leftPct}%` }} title={`${isQuiz ? 'Quiz' : 'Overlay'} @ ${fmt(it.atSec)}`} data-testid={`marker-${it.id}`}
              className={`absolute top-0 h-full w-3 -ml-1.5 rounded-sm border-2 border-white shadow cursor-grab active:cursor-grabbing ${selectedId === it.id ? 'ring-2 ring-offset-1 ring-amber-400 ' : ''}${isQuiz ? 'bg-blue-600' : 'bg-purple-600'}`} />
          );
        })}
        {clip.interactions.filter((it): it is OverlayInteraction => it.type === 'overlay' && it.untilSec != null).map((it) => {
          const l = (Math.min(it.atSec, duration) / duration) * 100;
          const w = ((Math.min(it.untilSec!, duration) - it.atSec) / duration) * 100;
          return <div key={`span-${it.id}`} style={{ left: `${l}%`, width: `${Math.max(w, 0)}%` }} className="absolute top-0 h-full bg-purple-300/40 pointer-events-none" />;
        })}
      </div>
      {clip.interactions.length === 0 && <p className="text-xs text-gray-400">Nicio interacțiune. Click pe bară pentru a adăuga una.</p>}
      {selected && (
        <div className="rounded-md border bg-gray-50 p-3 space-y-3" data-testid="marker-config">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${selected.type === 'quiz' ? 'text-blue-700' : 'text-purple-700'}`}>{selected.type === 'quiz' ? 'Întrebare (quiz)' : 'Mesaj (overlay)'}</span>
            <div className="ml-auto flex items-center gap-2">
              <Label className="text-xs text-gray-500">Secundă</Label>
              <Input type="number" min={0} max={duration} value={selected.atSec} onChange={(e) => patch(selected.id, { atSec: Math.min(Math.max(0, Math.round(+e.target.value || 0)), duration) })} className="h-7 w-20 text-xs" />
              <button type="button" onClick={() => removeMarker(selected.id)} className="text-red-500 hover:text-red-700" data-testid="marker-delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          {selected.type === 'quiz' ? (
            <div className="space-y-2">
              <div><Label className="text-xs">Întrebare</Label><Input value={selected.question} onChange={(e) => patch(selected.id, { question: e.target.value })} placeholder="Scrie întrebarea..." className="mt-1" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">Opțiuni (bifează cele corecte)</Label>
                {selected.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input type="checkbox" checked={selected.correctIndexes.includes(oIdx)} onChange={() => toggleCorrect(selected, oIdx)} className="accent-blue-600" title="Răspuns corect" />
                    <span className="text-xs text-gray-500 w-4">{String.fromCharCode(65 + oIdx)}.</span>
                    <Input value={opt} onChange={(e) => setOption(selected, oIdx, e.target.value)} placeholder={`Opțiunea ${String.fromCharCode(65 + oIdx)}`} className="h-8 flex-1" />
                    <button type="button" onClick={() => removeOption(selected, oIdx)} disabled={selected.options.length <= 2} className="text-red-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() => addOption(selected)} disabled={selected.options.length >= 10} className="text-blue-600 text-xs"><Plus className="w-3 h-3 mr-1" /> Adaugă opțiune</Button>
              </div>
              <div><Label className="text-xs">Explicație (opțional)</Label><Textarea value={selected.explanation ?? ''} onChange={(e) => patch(selected.id, { explanation: e.target.value })} rows={2} placeholder="Afișată după un răspuns greșit..." className="mt-1" /></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div><Label className="text-xs">Titlu</Label><Input value={selected.title} onChange={(e) => patch(selected.id, { title: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Text</Label><Textarea value={selected.text} onChange={(e) => patch(selected.id, { text: e.target.value })} rows={2} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Până la secunda</Label><Input type="number" min={selected.atSec} max={duration} value={selected.untilSec ?? ''} onChange={(e) => patch(selected.id, { untilSec: e.target.value === '' ? undefined : Math.min(Math.max(selected.atSec, Math.round(+e.target.value)), duration) })} className="mt-1" /></div>
                <div><Label className="text-xs">Text buton (opțional)</Label><Input value={selected.ctaLabel ?? ''} onChange={(e) => patch(selected.id, { ctaLabel: e.target.value || undefined })} className="mt-1" /></div>
              </div>
              <div><Label className="text-xs">Link buton (opțional)</Label><Input value={selected.ctaHref ?? ''} onChange={(e) => patch(selected.id, { ctaHref: e.target.value || undefined })} placeholder="https://..." className="mt-1" /></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
