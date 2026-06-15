'use client';

import { use } from 'react';
import CourseEditEditor from '@/components/courses/CourseEditEditor';

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <CourseEditEditor
      id={id}
      config={{
        apiBase: '/admin',
        listPath: '/admin/courses',
        courseQueryKey: 'admin-course',
        curriculumQueryKey: 'admin-curriculum',
        coursesQueryKey: ['admin-courses'],
        quizCorrectHint: 'Bifează una sau mai multe opțiuni corecte.',
        keepLoadedOptions: (len) => len === 4,
      }}
    />
  );
}
