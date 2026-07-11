import type { Metadata } from 'next';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await fetch(`${API_URL}/courses/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const course = await res.json();

    return {
      title: `${course.title} | Inovatrium Learning Hub`,
      description: course.description?.slice(0, 160),
      openGraph: {
        title: course.title,
        description: course.description?.slice(0, 160),
        images: course.thumbnail ? [{ url: course.thumbnail }] : [],
        type: 'website',
      },
    };
  } catch {
    return {};
  }
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
