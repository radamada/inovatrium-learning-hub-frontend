import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300 mt-auto">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-10">

          {/* Col 1 — Brand + description + badges */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <GraduationCap className="text-indigo-400 w-6 h-6" />
              <span className="font-bold text-white text-lg">
                Ino<span className="text-indigo-400">versity</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Platformă de cursuri online dedicată dezvoltării profesionale și personale.
              Accesează sute de cursuri create de formatori verificați.
            </p>
            <div className="flex flex-row flex-wrap gap-3 mt-2">
              <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://pieseautofab-cdn.fra1.digitaloceanspaces.com/misc/anpc-sal.webp" alt="ANPC - Soluționarea Alternativă a Litigiilor" style={{ height: 40 }} />
              </a>
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://pieseautofab-cdn.fra1.digitaloceanspaces.com/misc/anpc-sol.png" alt="SOL - Soluționarea Online a Litigiilor" style={{ height: 40 }} />
              </a>
            </div>
          </div>

          {/* Col 2 — Navigare */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Navigare</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/courses" className="hover:text-indigo-400 transition-colors">Cursuri</Link></li>
              <li><Link href="/dashboard" className="hover:text-indigo-400 transition-colors">Cursurile mele</Link></li>
            </ul>
          </div>

          {/* Col 3 — Informații */}
          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Informații</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/termeni" className="hover:text-indigo-400 transition-colors">Termeni și Condiții</Link></li>
              <li><Link href="/confidentialitate" className="hover:text-indigo-400 transition-colors">Politica de Confidențialitate</Link></li>
              <li><Link href="/politica-cookies" className="hover:text-indigo-400 transition-colors">Politica Cookies</Link></li>
              <li><Link href="/contact" className="hover:text-indigo-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} Inoversity. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </footer>
  );
}
