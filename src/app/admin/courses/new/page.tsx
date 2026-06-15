'use client';

import CourseCreateEditor from '@/components/courses/CourseCreateEditor';

export default function AdminNewCoursePage() {
  return (
    <CourseCreateEditor
      config={{
        apiBase: '/admin',
        listPath: '/admin/courses',
        coursesQueryKey: ['admin-courses'],
        isAdmin: true,
        quizCorrectHint: 'Bifează una sau mai multe opțiuni corecte.',
      }}
    />
  );
}
