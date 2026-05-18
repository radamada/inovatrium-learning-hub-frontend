import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-gray-300 mt-auto">
      {/* Main footer */}
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 3xl:px-32 py-12">
        <div className="flex flex-col md:flex-row md:justify-between gap-10">

          {/* Col 1 — Brand + description + badges */}
          <div className="flex flex-col gap-4 max-w-md">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <GraduationCap className="text-blue-400 w-6 h-6" />
              <span className="font-bold text-white text-lg">
                Ino<span className="text-indigo-400">versity</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Platformă de cursuri online dedicată dezvoltării profesionale și personale.
              <br />
              Accesează cursuri create de formatori verificați.
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

          {/* Right side — Navigare + Informații grupate împreună */}
          <div className="flex flex-col sm:flex-row gap-10 sm:gap-16 md:mr-16 lg:mr-28 xl:mr-44 3xl:mr-[20rem]">
            {/* Col 2 — Navigare */}
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Navigare</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/courses" className="hover:text-blue-400 transition-colors">Cursuri</Link></li>
                <li><Link href="/dashboard" className="hover:text-blue-400 transition-colors">Cursurile mele</Link></li>
              </ul>
            </div>

            {/* Col 3 — Informații */}
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Informații</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/termeni" className="hover:text-blue-400 transition-colors">Termeni și Condiții</Link></li>
                <li><Link href="/confidentialitate" className="hover:text-blue-400 transition-colors">Politica de Confidențialitate</Link></li>
                <li><Link href="/politica-cookies" className="hover:text-blue-400 transition-colors">Politica Cookies</Link></li>
                <li><Link href="/contact" className="hover:text-blue-400 transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="w-full px-4 sm:px-6 lg:px-8 3xl:px-12 py-4">
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} Inoversity. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    </footer>
  );
}
