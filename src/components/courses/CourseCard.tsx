'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, ArrowRight, Heart, Users } from 'lucide-react';
import type { Course } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CourseCardProps {
  course: Course;
  isEnrolled?: boolean;
  priority?: boolean;
}

const levelLabels: Record<string, string> = {
  beginner: 'Începător',
  intermediate: 'Intermediar',
  advanced: 'Avansat',
};

const levelColors: Record<string, string> = {
  beginner: 'bg-emerald-600 text-white',
  intermediate: 'bg-blue-600 text-white',
  advanced: 'bg-purple-600 text-white',
};

export default function CourseCard({ course, isEnrolled = false, priority = false }: CourseCardProps) {
  const { user } = useAuthStore();
  const { addItem, items } = useCartStore();
  const { has, add, remove } = useWishlistStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const inCart = items.some((i) => i._id === course._id);
  const inWishlist = has(course._id);

  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    if (isAddingToCart) return;
    setIsAddingToCart(true);
    try {
      await addItem(course._id);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    try {
      if (inWishlist) {
        await remove(course._id);
        queryClient.setQueryData(['wishlist'], (old: any[]) =>
          old ? old.filter((item: any) => item.courseId?._id !== course._id) : old,
        );
      } else {
        await add(course._id);
        queryClient.setQueryData(['wishlist'], (old: any[]) =>
          old ? [...old, { courseId: course }] : [{ courseId: course }],
        );
        toast.success('Adăugat la salvate');
      }
    } catch {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.error('A apărut o eroare');
    }
  };

  const description = course.description?.replace(/<[^>]*>/g, '') ?? '';

  return (
    <Link href={`/courses/${course.slug}`} className="group block">
      <div
        className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200/60 dark:ring-slate-600/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full transform-gpu"
      >
        {/* Thumbnail */}
        <div className="relative h-48 sm:h-52 bg-blue-50/60 overflow-hidden">
          {course.thumbnail ? (
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center">
              <BookOpen className="w-14 h-14 text-blue-200" />
            </div>
          )}

          {/* Level badge overlaid on image */}
          {course.level && (
            <div className="absolute top-3 left-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm ${levelColors[course.level] ?? 'bg-gray-700 text-white'}`}>
                {levelLabels[course.level] ?? course.level}
              </span>
            </div>
          )}

          {/* Enrolled badge */}
          {isEnrolled && (
            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2.5 py-1 rounded-md font-bold shadow">
              ✓ Deținut
            </div>
          )}

          {/* Wishlist button */}
          {!isEnrolled && (
            <button
              onClick={handleWishlist}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-colors"
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
        <div className="px-5 pt-5 pb-5 flex flex-col flex-1">
          {/* Category */}
          {course.categoryId && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-2">
              {course.categoryId.name}
            </p>
          )}

          {/* Title + Price row */}
          <div className="flex items-start justify-between gap-4 mb-3 min-h-[3rem]">
            {/* break-words guards against unbroken 200-char strings (URLs,
                long IDs) that line-clamp alone would let overflow on mobile. */}
            <h3 className="font-bold text-[17px] leading-snug text-gray-900 line-clamp-2 break-words min-w-0 group-hover:text-blue-600 transition-colors">
              {course.title}
            </h3>
            <span className="text-lg font-extrabold text-gray-900 whitespace-nowrap shrink-0">
              {course.price.toFixed(2)}<span className="text-sm font-semibold text-gray-400 ml-0.5">lei</span>
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed min-h-[2.625rem]">
            {description}
          </p>

          {/* Divider */}
          <div className="border-t border-gray-100 mt-auto pt-5">
            {/* Bottom row: Instructor + Action */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {course.instructorId?.avatar ? (
                  <Image
                    src={course.instructorId.avatar}
                    alt={course.instructorId.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                    {course.instructorId?.name?.charAt(0)?.toUpperCase() ?? 'F'}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 truncate">
                  {course.instructorId?.name ?? 'Formator'}
                </span>
              </div>

              <div className="shrink-0">
                {isEnrolled ? (
                  <button
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:gap-1.5 transition-all"
                    onClick={(e) => { e.preventDefault(); router.push(`/courses/${course.slug}/learn`); }}
                  >
                    Continuă <ArrowRight className="w-3 h-3" />
                  </button>
                ) : inCart ? (
                  <button
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:gap-1.5 transition-all"
                    onClick={(e) => { e.preventDefault(); router.push('/checkout'); }}
                  >
                    În coș <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:gap-1.5 transition-all disabled:opacity-50"
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                  >
                    Adaugă <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
