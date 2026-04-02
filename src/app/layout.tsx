import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | EduInovatrium',
    default: 'EduInovatrium – Cursuri Online',
  },
  description:
    'Platformă de cursuri online. Învață de la experți și accesează conținut premium.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-background`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
