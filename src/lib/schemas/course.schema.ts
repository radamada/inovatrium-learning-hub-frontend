import { z } from 'zod';

/**
 * Shared Zod schema for the course "info" step, used by both the create and
 * edit course editors (admin + instructor). Extracted to remove the identical
 * copy-paste that previously lived in all four course-editor pages.
 */
export const courseSchema = z.object({
  title: z.string().min(3, 'Minim 3 caractere'),
  description: z.string().min(10, 'Minim 10 caractere'),
  price: z.coerce.number({ error: 'Prețul este obligatoriu' }).min(30, 'Prețul minim este 30 lei').max(2000, 'Prețul maxim este 2000 lei'),
  categoryId: z.string({ error: 'Categoria este obligatorie' }).min(1, 'Categoria este obligatorie'),
  level: z.string({ error: 'Nivelul este obligatoriu' }).min(1, 'Nivelul este obligatoriu'),
  language: z.string().default('ro'),
});

export type CourseFormData = z.infer<typeof courseSchema>;
