import { z } from 'zod';

// Shared password validation rule used across auth-related forms
// (register, reset-password, profile change-password). Keep a single source of
// truth so the rules (min 8, max 72, at least one lower + upper + digit) never
// drift between screens.
export const passwordSchema = z
  .string()
  .min(8, 'Minim 8 caractere')
  .max(72, 'Maxim 72 caractere')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Parola trebuie să conțină cel puțin o literă mare, o literă mică și o cifră',
  );
