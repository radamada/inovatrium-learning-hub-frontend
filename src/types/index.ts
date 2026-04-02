export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  avatar: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  darkMode?: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Instructor {
  _id: string;
  name: string;
  avatar: string;
}

export interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  instructorId: Instructor;
  price: number;
  categoryId: Category | null;
  tags: string[];
  published: boolean;
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
  whatYouLearn: string[];
  requirements: string[];
  level: string;
  language: string;
  createdAt: string;
}

export interface Lesson {
  _id: string;
  courseId: string;
  sectionId: string;
  title: string;
  description: string;
  cdnVideoId: string;
  duration: number;
  order: number;
  isFree: boolean;
}

export interface Section {
  _id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface CartItem {
  _id: string;
  title: string;
  slug: string;
  thumbnail: string;
  price: number;
  rating: number;
  instructorId: Instructor;
}

export interface Cart {
  userId: string;
  items: CartItem[];
}

export interface OrderItem {
  courseId: string;
  title: string;
  price: number;
}

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  stripePaymentIntentId: string | null;
  stripeClientSecret: string | null;
  createdAt: string;
}

export interface Enrollment {
  _id: string;
  userId: string;
  courseId: Course;
  orderId: string | null;
  completedLessons: string[];
  lastAccessedAt: string | null;
  completedAt: string | null;
  status: 'active' | 'refunded';
  createdAt: string;
}

export interface Review {
  _id: string;
  userId: { _id: string; name: string; avatar: string };
  courseId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}
