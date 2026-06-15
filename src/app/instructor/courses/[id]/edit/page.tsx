'use client';

import { use } from 'react';
import CourseEditEditor from '@/components/courses/CourseEditEditor';

export default function InstructorEditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <CourseEditEditor
      id={id}
      config={{
        apiBase: '/instructor',
        listPath: '/instructor/courses',
        courseQueryKey: 'instructor-course',
        curriculumQueryKey: 'instructor-curriculum',
        coursesQueryKey: ['instructor-courses'],
        quizCorrectHint: 'Selectează cercul radio pentru a marca răspunsul corect.',
        keepLoadedOptions: (len) => len >= 2,
      }}
    />
  );
}
