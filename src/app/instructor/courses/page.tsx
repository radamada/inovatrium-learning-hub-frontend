'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Edit, Eye, EyeOff, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
import api from '@/lib/api';
import { motion } from 'framer-motion';

interface MyCourse {
  _id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  published: boolean;
  price: number;
  enrollmentCount: number;
  createdAt: string;
}

export default function InstructorCoursesPage() {
  const qc = useQueryClient();
  const [retractTarget, setRetractTarget] = useState<MyCourse | null>(null);

  const { data: courses, isLoading } = useQuery<MyCourse[]>({
    queryKey: ['instructor-courses'],
    queryFn: () => api.get('/instructor/courses').then((r) => r.data),
  });

  const togglePublish = useMutation({
    mutationFn: (id: string) => api.patch(`/instructor/courses/${id}/publish`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success(res.data.published ? 'Curs publicat!' : 'Curs retras din catalog');
      setRetractTarget(null);
    },
    onError: () => toast.error('Eroare la actualizarea statusului'),
  });

  const handlePublishClick = (course: MyCourse) => {
    if (course.published) {
      // Retragere — arată dialog de confirmare
      setRetractTarget(course);
    } else {
      // Publicare — direct, fără confirmare
      togglePublish.mutate(course._id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cursurile mele</h1>
          <p className="text-gray-500 mt-1">Gestionează cursurile tale</p>
        </div>
        <Button render={<Link href="/instructor/courses/new" />} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Curs nou
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border rounded-xl p-4">
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <div className="text-center py-20 bg-white border rounded-2xl">
          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Nu ai niciun curs încă.</p>
          <Button render={<Link href="/instructor/courses/new" />} className="bg-emerald-600 hover:bg-emerald-700">
            Creează primul curs
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {courses.map((course) => (
              <div key={course._id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{course.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(course.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <Badge variant={course.published ? 'default' : 'secondary'} className="flex-shrink-0">
                    {course.published ? 'Publicat' : 'Draft'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-emerald-700">{course.price.toFixed(2)} lei</span>
                    <span className="text-gray-500">{Math.max(0, course.enrollmentCount)} înrolați</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/instructor/courses/${course._id}/edit`} />}
                      className="flex items-center gap-1 h-7 text-xs"
                    >
                      <Edit className="w-3.5 h-3.5" /> Editează
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={togglePublish.isPending}
                      onClick={() => handlePublishClick(course)}
                      className="flex items-center gap-1 h-7 text-xs"
                    >
                      {course.published ? (
                        <><EyeOff className="w-3.5 h-3.5" /> Retrage</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5" /> Publică</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Titlu</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Preț</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Înrolați</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {courses.map((course) => (
                    <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{course.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(course.createdAt).toLocaleDateString('ro-RO')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={course.published ? 'default' : 'secondary'}>
                          {course.published ? 'Publicat' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                        {course.price.toFixed(2)} lei
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {Math.max(0, course.enrollmentCount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            render={<Link href={`/instructor/courses/${course._id}/edit`} />}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" /> Editează
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={togglePublish.isPending}
                            onClick={() => handlePublishClick(course)}
                            className="flex items-center gap-1"
                          >
                            {course.published ? (
                              <><EyeOff className="w-3.5 h-3.5" /> Retrage</>
                            ) : (
                              <><Eye className="w-3.5 h-3.5" /> Publică</>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!retractTarget}
        onOpenChange={(open) => { if (!open) setRetractTarget(null); }}
        title="Retrage cursul din catalog?"
        description={`„${retractTarget?.title}" va fi ascuns din marketplace. Studenții înscriși îl vor putea accesa în continuare, dar vor fi notificați că nu mai primesc actualizări.`}
        confirmLabel="Retrage cursul"
        confirmVariant="warning"
        loading={togglePublish.isPending}
        onConfirm={() => retractTarget && togglePublish.mutate(retractTarget._id)}
      />
    </motion.div>
  );
}
