'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Heart, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import CourseCard from '@/components/courses/CourseCard';
import api from '@/lib/api';

export default function WishlistPage() {
  const { user, isHydrated } = useAuthStore();
  const router = useRouter();
  const wishlistIds = useWishlistStore((s) => s.courseIds);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) { router.push('/login?from=/wishlist'); return; }
  }, [user, isHydrated]);

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    enabled: !!user,
    queryFn: () => api.get('/wishlist').then((r) => r.data),
  });

  if (!user) return null;

  // Filter prin store-ul optimistic — cardul dispare imediat la remove,
  // fără să așteptăm re-fetch-ul din React Query
  const courses = data
    ? data.map((item: any) => item.courseId).filter((c: any) => c && wishlistIds.has(c._id))
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="text-red-500 fill-red-500 w-6 h-6" />
          Cursuri salvate
        </h1>
        <p className="text-gray-500 mt-1">Cursurile pe care le-ai marcat pentru mai târziu.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg mb-4">Nu ai salvat niciun curs încă.</p>
          <Button render={<Link href="/" />} className="bg-indigo-600 hover:bg-indigo-700">
            Explorează cursuri
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
