# Color Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Înlocuirea paletei vizuale Inoversity cu tripleta #3853A3 (primar), #5B4FC8 (indigo secundar), #69BC45 (verde CTA), inclusiv dark mode.

**Architecture:** Modificări concentrate într-un singur fișier CSS (`frontend/src/app/globals.css`) prin suprascrierea paletelor Tailwind 4 (`--color-blue-*`, plus paletele noi indigo/emerald/green). Zero modificări la `className`-uri. Separat, 3 ocurențe hex hardcodate în Recharts charts (admin + instructor pages).

**Tech Stack:** Tailwind CSS v4 (paletă custom via CSS vars în `@theme inline`), Next.js 16 App Router, Recharts. Nu există suită de teste vizuale automate; verificarea e prin grep + inspecție manuală.

**Spec:** [docs/superpowers/specs/2026-05-18-color-redesign-design.md](../specs/2026-05-18-color-redesign-design.md)

---

## File Structure

**Modificate (2 fișiere cod + 1 verificare):**

- `frontend/src/app/globals.css` — paletă blue rescrisă, paletele indigo/emerald/green adăugate, tokens semantice primary/ring actualizate pentru light + dark mode
- `frontend/src/app/admin/page.tsx` — 2 ocurențe hex `#427AA1` → `#3853A3` (Recharts Bar fills)
- `frontend/src/app/instructor/page.tsx` — 1 ocurență hex `#427AA1` → `#3853A3` (Recharts Bar fill)

**Verificat (out of scope dar inspectat la final):**
- `frontend/src/app/(auth)/login/page.tsx` și `register/page.tsx` — hex-uri Google logo (NU modificăm)

---

## Strategie generală

Modificările la `globals.css` sunt interdependente (definițiile palete + tokens semantice trebuie să rămână consistente). Le grupăm într-o singură task cu sub-steps logici, cu commit unic. Recharts intră într-un al doilea commit separat.

---

### Task 1: Update `globals.css` — palete + tokens semantice

**Files:**
- Modify: `frontend/src/app/globals.css`

Linii cheie (referință):
- 57–68: blocul `Ink Blue` actual (paletă blue)
- 71–105 aprox.: blocul `:root`
- 107–160 aprox.: blocul `.dark`

#### Sub-task 1A: Înlocuiește paleta `--color-blue-*`

- [ ] **Step 1: Citește contextul linilor 56–70**

Folosește Read pe `frontend/src/app/globals.css` cu offset 56, limit 15. Confirmă că vezi exact blocul:

```css
  /* ── Ink Blue — cerneală de stilou (Royal Blue Ink) ── */
  --color-blue-50:  hsl(222, 65%, 96%);
  --color-blue-100: hsl(222, 60%, 91%);
  ...
  --color-blue-950: hsl(222, 72%, 10%);
}
```

- [ ] **Step 2: Înlocuiește blocul Ink Blue (Edit)**

Edit cu `replace_all: false`:
- `old_string`:
```
  /* ── Ink Blue — cerneală de stilou (Royal Blue Ink) ── */
  --color-blue-50:  hsl(222, 65%, 96%);
  --color-blue-100: hsl(222, 60%, 91%);
  --color-blue-200: hsl(222, 55%, 82%);
  --color-blue-300: hsl(222, 58%, 68%);
  --color-blue-400: hsl(222, 65%, 55%);
  --color-blue-500: hsl(222, 72%, 45%);
  --color-blue-600: hsl(222, 78%, 38%);
  --color-blue-700: hsl(222, 80%, 30%);
  --color-blue-800: hsl(222, 78%, 23%);
  --color-blue-900: hsl(222, 75%, 17%);
  --color-blue-950: hsl(222, 72%, 10%);
```
- `new_string`:
```
  /* ── Royal Blue Ink (primar Inoversity, #3853A3) ── */
  --color-blue-50:  hsl(225, 65%, 96%);
  --color-blue-100: hsl(225, 60%, 91%);
  --color-blue-200: hsl(225, 55%, 82%);
  --color-blue-300: hsl(225, 50%, 68%);
  --color-blue-400: hsl(225, 50%, 55%);
  --color-blue-500: hsl(225, 50%, 47%);
  --color-blue-600: hsl(225, 49%, 43%);
  --color-blue-700: hsl(225, 52%, 35%);
  --color-blue-800: hsl(225, 55%, 27%);
  --color-blue-900: hsl(225, 58%, 18%);
  --color-blue-950: hsl(225, 60%, 11%);

  /* ── Indigo (ton secundar brand, #5B4FC8) ── */
  --color-indigo-50:  hsl(247, 80%, 97%);
  --color-indigo-100: hsl(247, 75%, 93%);
  --color-indigo-200: hsl(247, 70%, 85%);
  --color-indigo-300: hsl(247, 65%, 75%);
  --color-indigo-400: hsl(247, 58%, 65%);
  --color-indigo-500: hsl(247, 53%, 55%);
  --color-indigo-600: hsl(247, 53%, 48%);
  --color-indigo-700: hsl(247, 55%, 40%);
  --color-indigo-800: hsl(247, 58%, 32%);
  --color-indigo-900: hsl(247, 60%, 22%);
  --color-indigo-950: hsl(247, 62%, 14%);

  /* ── Vibrant Lime (accent CTA/succes, #69BC45) — emerald + green pe aceeași rampă ── */
  --color-emerald-50:  hsl(106, 70%, 96%);
  --color-emerald-100: hsl(106, 65%, 90%);
  --color-emerald-200: hsl(106, 55%, 80%);
  --color-emerald-300: hsl(106, 50%, 65%);
  --color-emerald-400: hsl(106, 50%, 55%);
  --color-emerald-500: hsl(106, 50%, 50%);
  --color-emerald-600: hsl(106, 52%, 42%);
  --color-emerald-700: hsl(106, 55%, 35%);
  --color-emerald-800: hsl(106, 58%, 27%);
  --color-emerald-900: hsl(106, 60%, 18%);
  --color-emerald-950: hsl(106, 62%, 10%);

  --color-green-50:  hsl(106, 70%, 96%);
  --color-green-100: hsl(106, 65%, 90%);
  --color-green-200: hsl(106, 55%, 80%);
  --color-green-300: hsl(106, 50%, 65%);
  --color-green-400: hsl(106, 50%, 55%);
  --color-green-500: hsl(106, 50%, 50%);
  --color-green-600: hsl(106, 52%, 42%);
  --color-green-700: hsl(106, 55%, 35%);
  --color-green-800: hsl(106, 58%, 27%);
  --color-green-900: hsl(106, 60%, 18%);
  --color-green-950: hsl(106, 62%, 10%);
```

#### Sub-task 1B: Actualizează `--primary` și `--ring` în `:root`

- [ ] **Step 3: Înlocuiește `--primary` în `:root`**

Edit cu `replace_all: false`:
- `old_string`: `  --primary:              hsl(222, 78%, 38%);`
- `new_string`: `  --primary:              hsl(225, 49%, 43%);   /* #3853A3 */`

- [ ] **Step 4: Înlocuiește `--ring` în `:root`**

Edit cu `replace_all: false`:
- `old_string`: `  --ring:                 hsl(222, 78%, 38%);`
- `new_string`: `  --ring:                 hsl(225, 49%, 43%);   /* #3853A3 */`

#### Sub-task 1C: Actualizează `--primary` și `--ring` în `.dark`

- [ ] **Step 5: Înlocuiește `--primary` în `.dark`**

Edit cu `replace_all: false`:
- `old_string`: `  --primary:              hsl(217, 91%, 60%);`
- `new_string`: `  --primary:              hsl(225, 70%, 60%);`

- [ ] **Step 6: Înlocuiește `--ring` în `.dark`**

Edit cu `replace_all: false`:
- `old_string`: `  --ring:                 hsl(217, 91%, 60%);`
- `new_string`: `  --ring:                 hsl(225, 70%, 60%);`

#### Sub-task 1D: Adaugă overrides shade-uri în `.dark`

În blocul `.dark`, după `--ring`, adăugăm override-uri pentru shade-urile brand-ului care arată prea închise pe fundal dark. Acestea trebuie să fie ÎN INTERIORUL blocului `.dark { ... }`, înainte de acolada de închidere.

- [ ] **Step 7: Citește contextul de la sfârșitul blocului `.dark`**

Folosește Read pe `frontend/src/app/globals.css` cu offset 105, limit 60 pentru a vedea blocul `.dark` complet (de la `{` până la `}` final) și identifica linia exactă a acoladei de închidere.

- [ ] **Step 8: Inserează overrides-uri înaintea acoladei de închidere `.dark`**

Edit cu `replace_all: false`. `old_string` va fi ultima linie utilă din blocul `.dark` urmată de acolada de închidere. Identifică acea linie din Step 7 — probabil ceva de forma:

```css
  --sidebar-ring:         hsl(217, 91%, 60%);
}
```

Înlocuiește-l cu (păstrând linia originală și adăugând blocul nou înainte de `}`):

```css
  --sidebar-ring:         hsl(225, 70%, 60%);

  /* Brand shades — luminozitate ridicată pentru contrast pe fundal dark */
  --color-blue-400:    hsl(225, 70%, 65%);
  --color-blue-600:    hsl(225, 49%, 50%);
  --color-indigo-400:  hsl(247, 65%, 70%);
  --color-indigo-500:  hsl(247, 60%, 65%);
  --color-emerald-500: hsl(106, 55%, 55%);
  --color-emerald-600: hsl(106, 55%, 50%);
  --color-green-500:   hsl(106, 55%, 55%);
  --color-green-600:   hsl(106, 55%, 50%);
}
```

Notă: și `--sidebar-ring` se aliniază la noul ring brand. Dacă linia exactă din Step 7 diferă, ajustează `old_string` și `new_string` corespunzător — păstrând structura: ultima linie utilă + acolada de închidere ⇒ ultima linie actualizată + bloc nou + acolada de închidere.

#### Sub-task 1E: Verificare

- [ ] **Step 9: Verifică sintaxa și consistența**

Rulează:
```bash
cd frontend && npx tsc --noEmit
```

Așteptat: 0 erori (erori pre-existente în alte fișiere — `CourseFilters.tsx`, `courses/page.tsx`, `page.tsx` — ignoră-le; sunt legate de Framer Motion types și nu sunt afectate de schimbarea CSS).

- [ ] **Step 10: Verifică prezența noilor culori**

```bash
cd /Users/rada/Desktop/Projects/test_platforma_cursuri_2 && grep -nE "#3853A3|225, 49%, 43%|--color-indigo-|--color-emerald-|--color-green-" frontend/src/app/globals.css
```

Așteptat: cel puțin 35 linii (paleta blue cu 11 shade-uri + 11 indigo + 11 emerald + 11 green + 1 referință #3853A3 + 2-4 tokens semantice = >35).

- [ ] **Step 11: Commit**

```bash
cd /Users/rada/Desktop/Projects/test_platforma_cursuri_2 && git add frontend/src/app/globals.css && git commit -m "$(cat <<'EOF'
feat(design): rebrand paletă culori — #3853A3, #5B4FC8, #69BC45

Înlocuiește paleta blue cu Royal Blue Ink (#3853A3); adaugă paletă
indigo (#5B4FC8) și unifică emerald+green pe rampă Lime (#69BC45).
Actualizează tokens semantice --primary și --ring pentru light + dark.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update Recharts hardcoded hex colors

**Files:**
- Modify: `frontend/src/app/admin/page.tsx:207,291`
- Modify: `frontend/src/app/instructor/page.tsx:192`

- [ ] **Step 1: Replace în admin/page.tsx**

Edit cu `replace_all: true`:
- `old_string`: `fill="#427AA1"`
- `new_string`: `fill="#3853A3"`

Așteptat: 2 ocurențe înlocuite.

- [ ] **Step 2: Replace în instructor/page.tsx**

Edit cu `replace_all: true`:
- `old_string`: `fill="#427AA1"`
- `new_string`: `fill="#3853A3"`

Așteptat: 1 ocurență înlocuită.

- [ ] **Step 3: Verifică că nu a mai rămas #427AA1**

```bash
cd /Users/rada/Desktop/Projects/test_platforma_cursuri_2 && grep -rnE "#427AA1" frontend/src 2>/dev/null
```

Așteptat: 0 rezultate.

- [ ] **Step 4: Verifică că nu există alte hex-uri brand suspecte (în afara Google logo)**

```bash
cd /Users/rada/Desktop/Projects/test_platforma_cursuri_2 && grep -rnE "fill=\"#[0-9a-fA-F]{6}\"|stroke=\"#[0-9a-fA-F]{6}\"" frontend/src --include="*.tsx" 2>/dev/null | grep -vE "#4285F4|#34A853|#FBBC05|#EA4335|#f0f0f0|#3853A3"
```

Așteptat: 0 rezultate. (Exclud Google brand colors + grid neutral + noul brand.)

- [ ] **Step 5: Commit**

```bash
cd /Users/rada/Desktop/Projects/test_platforma_cursuri_2 && git add frontend/src/app/admin/page.tsx frontend/src/app/instructor/page.tsx && git commit -m "$(cat <<'EOF'
feat(charts): actualizează culorile Recharts la noul primar #3853A3

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Smoke test manual (user-driven)

Verificarea finală e manuală — nu există suită de teste vizuale. Această task se completează când utilizatorul confirmă vizual rezultatul.

- [ ] **Step 1: Pornește frontend-ul**

```bash
cd /Users/rada/Desktop/Projects/test_platforma_cursuri_2/frontend && npm run dev
```

- [ ] **Step 2: Verifică light mode (delogat sau temă light)**

Parcurge următoarele pagini și verifică că noile culori apar corect:

1. `http://localhost:3000` — homepage: hero, buton primar (CTA), cards
2. `http://localhost:3000/cursuri` — listă cursuri: filtre, card-uri, paginare
3. `http://localhost:3000/login` — buton primar, link "Înregistrare", logo Google (rămâne nemodificat)
4. `http://localhost:3000/register` — același + Google
5. Detaliile unui curs (`/cursuri/<slug>`) — sticky purchase card cu buton CTA verde
6. `http://localhost:3000/checkout` (necesită item în cart) — buton de plată
7. `http://localhost:3000/dashboard` (necesită login) — progres bars, butoane

- [ ] **Step 3: Verifică dark mode**

Loghează-te (dark mode e disponibil doar pentru useri logați conform implementării), activează dark mode din profil/settings, parcurge aceleași pagini de la Step 2. Verifică în special:
- Link-urile brand (blue) sunt lizibile
- Butoanele primare au contrast bun (alb pe blue ridicat)
- Verdele CTA rămâne vibrant și citeț
- Indigo (dacă apare pe vreundeva via `text-indigo-*` viitor — momentan e doar adăugat în paletă pentru disponibilitate)

- [ ] **Step 4: Verifică panourile admin + instructor**

- `http://localhost:3000/admin` — dashboard cu Recharts (BarChart venituri lunare) — barele trebuie să apară în noul #3853A3
- `http://localhost:3000/instructor` — același pentru grafic personal

- [ ] **Step 5: Verifică contrastul textului alb pe verde**

În detaliile unui curs sau pe checkout, butonul primar CTA folosește verdele. Verifică ca textul alb pe verde să rămână lizibil. Codul folosește `bg-emerald-600/700` pe butoane (per stats spec — 63 + 30 ocurențe), ambele cu contrast ≥4.5:1 conform tabelului WCAG din spec. Dacă vreun buton apare cu text greu de citit, raportează-l — putem ajusta shade-ul specific local.

---

## Criterii de finalizare

- [ ] `globals.css` conține noua paletă blue (HSL 225), paleta indigo (HSL 247), paletele emerald + green (HSL 106), tokens semantice actualizate pentru `:root` și `.dark`
- [ ] `grep "#427AA1" frontend/src` → 0 rezultate
- [ ] `tsc --noEmit` pe frontend nu introduce erori noi (păstrează doar baseline-ul pre-existent)
- [ ] 2 commit-uri pe `main`: globals.css + Recharts
- [ ] Smoke test manual completat de utilizator pe minim 10 pagini (light + dark mode)
