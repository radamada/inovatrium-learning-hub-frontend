'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Category } from '@/types';

interface CourseFiltersProps {
  search: string;
  category: string;
  level: string;
  sortBy: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  instructorId?: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSortChange: (v: string) => void;
  onMinPriceChange?: (v: string) => void;
  onMaxPriceChange?: (v: string) => void;
  onMinRatingChange?: (v: string) => void;
  onInstructorChange?: (v: string) => void;
  showAdvanced?: boolean;
}

export default function CourseFilters({
  search,
  category,
  level,
  sortBy,
  minPrice = '',
  maxPrice = '',
  minRating = '',
  instructorId = '',
  onSearchChange,
  onCategoryChange,
  onLevelChange,
  onSortChange,
  onMinPriceChange,
  onMaxPriceChange,
  onMinRatingChange,
  onInstructorChange,
  showAdvanced = false,
}: CourseFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(showAdvanced);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: instructors } = useQuery<{ _id: string; name: string }[]>({
    queryKey: ['public-instructors'],
    queryFn: () => api.get('/users/instructors').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const hasAdvancedFilters = !!(minPrice || maxPrice || minRating || instructorId);

  return (
    <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border space-y-3">
      {/* Row 1: search + basic filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Caută cursuri..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category */}
        <Select value={category} onValueChange={(v) => onCategoryChange(v ?? '')}>
          <SelectTrigger className="w-44">
            <span className="truncate text-sm">
              {category === 'all'
                ? 'Toate categoriile'
                : (categories?.find((c) => c._id === category)?.name ?? 'Categorie')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate categoriile</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Level */}
        <Select value={level} onValueChange={(v) => onLevelChange(v ?? '')}>
          <SelectTrigger className="w-40">
            <span className="truncate text-sm">
              {level === 'all' ? 'Toate nivelele'
                : level === 'beginner' ? 'Începător'
                : level === 'intermediate' ? 'Intermediar'
                : 'Avansat'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate nivelele</SelectItem>
            <SelectItem value="beginner">Începător</SelectItem>
            <SelectItem value="intermediate">Intermediar</SelectItem>
            <SelectItem value="advanced">Avansat</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => onSortChange(v ?? '')}>
          <SelectTrigger className="w-44">
            <span className="truncate text-sm">
              {sortBy === 'newest' ? 'Cele mai noi'
                : sortBy === 'popular' ? 'Cele mai populare'
                : sortBy === 'rating' ? 'Rating înalt'
                : sortBy === 'price_asc' ? 'Preț crescător'
                : 'Preț descrescător'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Cele mai noi</SelectItem>
            <SelectItem value="popular">Cele mai populare</SelectItem>
            <SelectItem value="rating">Rating înalt</SelectItem>
            <SelectItem value="price_asc">Preț crescător</SelectItem>
            <SelectItem value="price_desc">Preț descrescător</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced toggle */}
        {(onMinPriceChange || onMaxPriceChange || onMinRatingChange) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdvancedOpen((o) => !o)}
            className={`gap-1.5 ${hasAdvancedFilters ? 'border-indigo-400 text-indigo-600' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtre avansate
            {hasAdvancedFilters && (
              <span className="bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                !
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Row 2: advanced filters */}
      {advancedOpen && (onMinPriceChange || onMaxPriceChange || onMinRatingChange) && (
        <div className="flex flex-wrap gap-3 pt-1 border-t border-gray-100">
          {(onMinPriceChange || onMaxPriceChange) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0">Preț (lei):</span>
              <Input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => onMinPriceChange?.(e.target.value)}
                className="w-24"
                min={0}
              />
              <span className="text-gray-400">–</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => onMaxPriceChange?.(e.target.value)}
                className="w-24"
                min={0}
              />
            </div>
          )}

          {onMinRatingChange && (
            <Select value={minRating || 'any'} onValueChange={(v) => onMinRatingChange(v === 'any' ? '' : v)}>
              <SelectTrigger className="w-44">
                <span className="truncate text-sm">
                  {!minRating || minRating === 'any' ? 'Orice rating'
                    : `⭐ ${minRating}+`}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Orice rating</SelectItem>
                <SelectItem value="4.5">⭐ 4.5+</SelectItem>
                <SelectItem value="4">⭐ 4.0+</SelectItem>
                <SelectItem value="3.5">⭐ 3.5+</SelectItem>
                <SelectItem value="3">⭐ 3.0+</SelectItem>
              </SelectContent>
            </Select>
          )}

          {onInstructorChange && (
            <Select value={instructorId || 'any'} onValueChange={(v) => onInstructorChange(v === 'any' ? '' : v)}>
              <SelectTrigger className="w-48">
                <span className="truncate text-sm">
                  {!instructorId ? 'Toți formatorii'
                    : (instructors?.find((i) => i._id === instructorId)?.name ?? 'Formator')}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Toți formatorii</SelectItem>
                {instructors?.map((i) => (
                  <SelectItem key={i._id} value={i._id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
