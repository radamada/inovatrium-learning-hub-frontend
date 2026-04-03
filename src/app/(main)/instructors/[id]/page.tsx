'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Users, BookOpen, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import CourseCard from '@/components/courses/CourseCard';
import api from '@/lib/api';

interface InstructorProfile {
  instructor: {
    _id: string;
    name: string;
    avatar: string;
    bio: string;
    createdAt: string;
  };
  courses: Array<{
    _id: string;
    title: string;
    slug: string;
    thumbnail: string;
    price: number;
    rating: number;
    reviewCount: number;
    enrollmentCount: number;
    level: string;
  }>;
}

export default function InstructorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery<InstructorProfile>({
    queryKey: ['instructor-profile', id],
    queryFn: () => api.get(`/users/instructors/${id}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-5">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-20 text-gray-500">
        Instructorul nu a fost găsit.
      </div>
    );
  }

  const { instructor, courses } = data;
  const totalStudents = courses.reduce((s, c) => s + c.enrollmentCount, 0);
  const avgRating = courses.length
    ? (courses.reduce((s, c) => s + c.rating, 0) / courses.length).toFixed(1)
    : null;
  const memberSince = new Date(instructor.createdAt).toLocaleDateString('ro-RO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Instructor header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10">
        <div className="relative w-24 h-24 flex-shrink-0">
          {instructor.avatar ? (
            <Image
              src={instructor.avatar}
              alt={instructor.name}
              fill
              sizes="(max-width: 768px) 96px, 128px"
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600">
              {instructor.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{instructor.name}</h1>
          {instructor.bio && (
            <p className="text-gray-600 text-sm mb-3 max-w-xl">{instructor.bio}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> {courses.length} {courses.length === 1 ? 'curs' : 'cursuri'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" /> {totalStudents} studenți
            </span>
            {avgRating && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {avgRating} rating mediu
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Membru din {memberSince}
            </span>
          </div>
        </div>
      </div>

      {/* Courses */}
      <h2 className="text-xl font-bold text-gray-900 mb-5">
        Cursuri ({courses.length})
      </h2>
      {courses.length === 0 ? (
        <p className="text-gray-400">Niciun curs publicat încă.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course._id} course={course as any} />
          ))}
        </div>
      )}
    </div>
  );
}
