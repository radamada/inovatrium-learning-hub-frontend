# Inoversity Frontend

Aplicație Next.js 16 pentru platforma de cursuri online Inoversity.

## Stack

Next.js 16, React 19, Tailwind CSS v4, shadcn (`@base-ui/react`), Framer Motion, Zustand 5, React Query 5, Axios, React Hook Form + Zod, Stripe.js, Video.js + HLS.js, Recharts, Sonner, date-fns.

## Setup local

1. **Clone și instalare:**
   ```bash
   git clone https://github.com/radamada/inoversity-frontend.git
   cd inoversity-frontend
   npm install
   ```

2. **Configurare environment:**
   ```bash
   cp .env.example .env.local
   ```
   Editează `.env.local` și completează valorile. `NEXT_PUBLIC_API_URL` trebuie să indice spre backend-ul Inoversity (default `http://localhost:3001`).

3. **Pornire dev server:**
   ```bash
   npm run dev
   ```
   Aplicația rulează la `http://localhost:3000`.

## Backend

Codul backend e separat în [inoversity-backend](https://github.com/radamada/inoversity-backend). Pentru dev local complet, clonează și rulează ambele.

## Documentație

`docs/superpowers/specs/` și `docs/superpowers/plans/` conțin design docs istorice — rebrand-ul EduInovatrium → Inoversity și color redesign-ul. Referințele textuale la `frontend/...` din ele sunt din monorepo-ul original; în repo-ul curent path-urile încep direct de la `src/`.

## Comenzi utile

| Comandă | Descriere |
|---|---|
| `npm run dev` | Dev server cu hot reload |
| `npm run build` | Build production |
| `npm run start` | Pornește production build local |
| `npx tsc --noEmit` | Type-check fără emit |
