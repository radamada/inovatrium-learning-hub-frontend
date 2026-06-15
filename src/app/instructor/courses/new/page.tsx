'use client';

import CourseCreateEditor from '@/components/courses/CourseCreateEditor';

export default function InstructorNewCoursePage() {
  return (
    <CourseCreateEditor
      config={{
        apiBase: '/instructor',
        listPath: '/instructor/courses',
        coursesQueryKey: ['instructor-courses'],
        isAdmin: false,
        quizCorrectHint: 'Selectează cercul radio pentru a marca răspunsul corect.',
      }}
    />
  );
}
