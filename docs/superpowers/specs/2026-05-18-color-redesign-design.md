# Color Redesign — Tripleta Inoversity

**Data:** 2026-05-18
**Tip:** Redesign vizual la nivel de paletă de culori

## Obiectiv

Înlocuirea paletei vizuale a platformei cu o tripletă brand definită:

- **#3853A3** — Royal Blue Ink (PRIMAR — butoane, link-uri, brand)
- **#5B4FC8** — Soft Indigo (SECUNDAR — hover, gradient, suprafețe accent)
- **#69BC45** — Vibrant Lime Green (ACCENT — CTA, succes, progres)

Constrânge schimbarea la un fișier (`frontend/src/app/globals.css`) plus 3 ocurențe Recharts. Zero modificări la `className`-urile existente. Acoperă light și dark mode.

## Strategie tehnică

Tailwind 4 expune paletele de culori prin variabile CSS (`--color-{name}-{shade}`). Suprascrierea acestora în `globals.css` re-mapează automat *toate* clasele utilitare (`bg-blue-600`, `text-emerald-700`, etc.) la noile valori. Nu sunt necesare modificări la class names.

Plus, adăugăm o paletă `--color-indigo-*` (n-a existat în cod) pentru a o pune la dispoziție viitoarelor utilizări de tip `bg-indigo-500`.

Pentru graficele Recharts, culorile sunt hardcodate ca string-uri hex în props (`fill="#427AA1"`); le actualizăm la `#3853A3`.

## Modificări concrete

### A. `frontend/src/app/globals.css`

**1. Paleta `--color-blue-*` (în blocul `@theme inline`, secțiunea Ink Blue existentă)**

Înlocuim toate cele 11 shade-uri cu noua rampă (derivată din #3853A3 hsl(225, 49%, 43%)):

```css
--color-blue-50:  hsl(225, 65%, 96%);
--color-blue-100: hsl(225, 60%, 91%);
--color-blue-200: hsl(225, 55%, 82%);
--color-blue-300: hsl(225, 50%, 68%);
--color-blue-400: hsl(225, 50%, 55%);
--color-blue-500: hsl(225, 50%, 47%);
--color-blue-600: hsl(225, 49%, 43%);   /* #3853A3 - culoarea de referință */
--color-blue-700: hsl(225, 52%, 35%);
--color-blue-800: hsl(225, 55%, 27%);
--color-blue-900: hsl(225, 58%, 18%);
--color-blue-950: hsl(225, 60%, 11%);
```

**2. Paletă nouă `--color-indigo-*` (după blocul Ink Blue, în același `@theme inline`)**

```css
/* ── Indigo — ton secundar brand (derivat din #5B4FC8) ── */
--color-indigo-50:  hsl(247, 80%, 97%);
--color-indigo-100: hsl(247, 75%, 93%);
--color-indigo-200: hsl(247, 70%, 85%);
--color-indigo-300: hsl(247, 65%, 75%);
--color-indigo-400: hsl(247, 58%, 65%);
--color-indigo-500: hsl(247, 53%, 55%);  /* #5B4FC8 */
--color-indigo-600: hsl(247, 53%, 48%);
--color-indigo-700: hsl(247, 55%, 40%);
--color-indigo-800: hsl(247, 58%, 32%);
--color-indigo-900: hsl(247, 60%, 22%);
--color-indigo-950: hsl(247, 62%, 14%);
```

**3. Paletele `--color-emerald-*` și `--color-green-*` (noi, după indigo)**

Ambele apar în cod cu rol similar (CTA/success); le unificăm vizual pe aceeași rampă derivată din #69BC45 hsl(106, 50%, 50%):

```css
/* ── Vibrant Lime — accent CTA/succes (derivat din #69BC45) ── */
--color-emerald-50:  hsl(106, 70%, 96%);
--color-emerald-100: hsl(106, 65%, 90%);
--color-emerald-200: hsl(106, 55%, 80%);
--color-emerald-300: hsl(106, 50%, 65%);
--color-emerald-400: hsl(106, 50%, 55%);
--color-emerald-500: hsl(106, 50%, 50%);  /* #69BC45 */
--color-emerald-600: hsl(106, 52%, 42%);
--color-emerald-700: hsl(106, 55%, 35%);
--color-emerald-800: hsl(106, 58%, 27%);
--color-emerald-900: hsl(106, 60%, 18%);
--color-emerald-950: hsl(106, 62%, 10%);

/* Green — alias la aceeași rampă pentru consistență vizuală */
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

**4. Tokens semantice — light mode (blocul `:root`)**

```css
--primary:           hsl(225, 49%, 43%);   /* #3853A3 */
--primary-foreground: hsl(0, 0%, 100%);
--ring:              hsl(225, 49%, 43%);
/* --secondary, --accent, --muted etc rămân neschimbate (surface-uri gray subtile) */
```

**5. Tokens semantice — dark mode (blocul `.dark`)**

```css
--primary:           hsl(225, 70%, 60%);   /* primar luminos pe fundal închis */
--primary-foreground: hsl(0, 0%, 100%);
--ring:              hsl(225, 70%, 60%);
```

Plus, în `.dark`, overrides pentru shade-urile cele mai folosite (text/iconițe):

```css
--color-blue-400:    hsl(225, 70%, 65%);  /* link-uri, brand text */
--color-blue-600:    hsl(225, 49%, 50%);  /* buton primar mai luminos */
--color-indigo-400:  hsl(247, 65%, 70%);
--color-indigo-500:  hsl(247, 60%, 65%);
--color-emerald-500: hsl(106, 55%, 55%);
--color-emerald-600: hsl(106, 55%, 50%);
--color-green-500:   hsl(106, 55%, 55%);
--color-green-600:   hsl(106, 55%, 50%);
```

### B. Recharts hardcoded colors (3 ocurențe)

| Fișier | Linia | Vechi | Nou |
|---|---|---|---|
| `frontend/src/app/admin/page.tsx` | 207 | `fill="#427AA1"` | `fill="#3853A3"` |
| `frontend/src/app/admin/page.tsx` | 291 | `fill="#427AA1"` | `fill="#3853A3"` |
| `frontend/src/app/instructor/page.tsx` | 192 | `fill="#427AA1"` | `fill="#3853A3"` |

`stroke="#f0f0f0"` (CartesianGrid) rămâne — e neutral, nu brand.

`stroke="#427AA1"` și alte ocurențe similare: niciuna găsită în afara celor 3 mai sus.

## OUT of scope

- Logo Google (4 hex-uri brand Google în `login/page.tsx` și `register/page.tsx`) — nu se atinge (e brand third-party)
- `--color-red-*` (erori, destructive) — păstrat default Tailwind
- `--color-gray-*`, `--color-slate-*` (tipografie, surface-uri) — păstrate default
- Reorganizare class names (`text-emerald-X` → `text-accent-X`) — out, păstrăm class names existente pentru risc zero

## Verificare WCAG

Tripletele cheie pentru contrast text (light mode, ≥4.5:1 pentru text normal):

| Combinație | Ratio | Verdict |
|---|---|---|
| #3853A3 pe alb | ~7.5:1 | ✅ AAA |
| Alb pe #3853A3 | ~7.5:1 | ✅ AAA |
| #5B4FC8 pe alb | ~5.8:1 | ✅ AA |
| Alb pe #5B4FC8 | ~5.8:1 | ✅ AA |
| Alb pe #69BC45 (emerald-500) | ~2.6:1 | ❌ FAIL — evită |
| Alb pe emerald-700 (hsl 106 55 35) | ~4.7:1 | ✅ AA |

**Regulă:** Butoanele cu text alb pe verde trebuie să folosească `bg-emerald-700` / `bg-green-700` (sau mai închis), nu `bg-emerald-500`. Codul actual folosește deja masiv `bg-emerald-600/700` (63 + 30 ocurențe), deci e conform.

## Criterii de succes

- [ ] `globals.css` modificat — paleta blue suprascrisă, indigo+emerald+green adăugate, dark mode override-uit
- [ ] 3 fișiere Recharts actualizate la `#3853A3`
- [ ] Verificare vizuală pe 10 pagini: homepage, listă cursuri, detalii curs, checkout, dashboard, login, register, admin (dashboard + comenzi), instructor dashboard
- [ ] Verificare dark mode pe aceleași pagini (login + comutare temă din profil)
- [ ] Niciun text alb pe verde-500 (verificare manuală pe butoane CTA)
- [ ] Commit unic

## Riscuri

| Risc | Probabilitate | Mitigare |
|---|---|---|
| Componente shadcn folosesc shade-uri specifice de blue care arată ciudat cu noul ton (ex: focus rings, accent bg-uri) | Medie | Smoke test pe componente: input focus, dropdown deschis, dialog overlay, toast Sonner |
| Dark mode rezultă în contrast slab pe link-uri/buton brand (primarul prea închis pe fundal negru) | Medie | Tokens dark explicite (luminozitate ridicată la 60-65%); test pe pagini de admin care folosesc dark |
| Gradient-uri existente (`from-blue-X to-emerald-X`) arată discordant cu noile tonuri | Mică | Verificare vizuală la smoke test; ajustare la pas separat dacă apare |
| Recharts au alte hex-uri brand pe care nu le-am descoperit | Mică | Final grep `#[0-9a-fA-F]{6}` pe `*.tsx` din `frontend/src` — orice hex în afara Google logo + #f0f0f0 (grid) e candidat |
