'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Users, BookOpen, ArrowRight, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Course } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CourseCardProps {
  course: Course;
  isEnrolled?: boolean;
}

export default function CourseCard({ course, isEnrolled = false }: CourseCardProps) {
  const { user } = useAuthStore();
  const { addItem, items } = useCartStore();
  const { has, add, remove } = useWishlistStore();
  const router = useRouter();

  const inCart = items.some((i) => i._id === course._id);
  const inWishlist = has(course._id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    await addItem(course._id);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    try {
      if (inWishlist) {
        await remove(course._id);
      } else {
        await add(course._id);
        toast.success('Adăugat la salvate');
      }
    } catch {
      toast.error('A apărut o eroare');
    }
  };

  return (
    <Link href={`/courses/${course.slug}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-200/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col h-full">
        {/* Thumbnail */}
        <div className="relative h-44 bg-indigo-50/60 overflow-hidden">
          {course.thumbnail ? (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-indigo-200" />
            </div>
          )}

          {/* Category badge */}
          {course.categoryId && (
            <div className="absolute top-3 left-3">
              <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200/50 shadow-sm">
                {course.categoryId.name}
              </span>
            </div>
          )}

          {/* Enrolled badge */}
          {isEnrolled && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow">
              ✓ Deținut
            </div>
          )}

          {/* Wishlist button */}
          {!isEnrolled && (
            <button
              onClick={handleWishlist}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 hover:bg-white shadow transition-colors"
              aria-label={inWishlist ? 'Elimină din salvate' : 'Salvează cursul'}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'
                }`}
              />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-bold text-base text-gray-900 line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
            {course.title}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {course.instructorId?.name ?? 'Formator'}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-600">{course.rating.toFixed(1)}</span>
              {course.reviewCount > 0 && <span className="text-gray-400">({course.reviewCount})</span>}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {Math.max(0, course.enrollmentCount)}
            </span>
            {course.level && (
              <Badge variant="outline" className="text-xs border-gray-200">
                {{ beginner: 'Începător', intermediate: 'Intermediar', advanced: 'Avansat' }[course.level] ?? course.level}
              </Badge>
            )}
          </div>

          {/* Price + action */}
          <div className="mt-auto flex justify-between items-center">
            <span className="text-xl font-extrabold text-indigo-600">
              {course.price.toFixed(2)}{' '}
              <span className="text-sm font-normal text-gray-400">lei</span>
            </span>

            {isEnrolled ? (
              <button
                className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:gap-2 transition-all"
                onClick={(e) => { e.preventDefault(); router.push(`/courses/${course.slug}/learn`); }}
              >
                Continuă <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : inCart ? (
              <button
                className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:gap-2 transition-all"
                onClick={(e) => { e.preventDefault(); router.push('/checkout'); }}
              >
                În coș <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:gap-2 transition-all"
                onClick={handleAddToCart}
              >
                Detalii <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
