export const metadata = {
  title: 'Politică Cookies — Inovatrium Learning Hub',
  description: 'Politica privind utilizarea cookie-urilor pe platforma Inovatrium Learning Hub.',
};

export default function PoliticaCookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Politică Cookies</h1>
      <p className="text-sm text-gray-400 mb-8">Ultima actualizare: 27 martie 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

        <section>
          <p>
            Folosim cookie-uri pentru a vă îmbunătăți experiența pe website-ul nostru{' '}
            <strong>learning.inovatrium.ro</strong>. Această politică face parte din Politica de Confidențialitate
            a Inovatrium Learning Hub și acoperă utilizarea cookie-urilor între dispozitivul dvs. și site-ul nostru.
          </p>
          <p className="mt-2">
            Dacă nu doriți să acceptați cookie-uri, puteți instrui browserul dvs. să le refuze,
            înțelegând că este posibil să nu vă putem oferi anumite funcționalități.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Ce este un cookie?</h2>
          <p>
            Un cookie este o mică informație pe care un site web o stochează pe dispozitivul dvs.
            atunci când îl vizitați. Conține în mod obișnuit informații despre site, un identificator
            unic care permite site-ului să vă recunoască browserul la revenire, date suplimentare
            și durata de viață a cookie-ului.
          </p>
          <p className="mt-2">
            Cookie-urile sunt utilizate pentru a permite anumite funcții (ex. autentificare), pentru
            a urmări utilizarea site-ului (ex. analiticele), pentru a stoca preferințele utilizatorului
            și pentru a personaliza conținutul.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Cookie-uri esențiale</h2>
          <p>
            Cookie-urile esențiale sunt necesare pentru funcționarea de bază a platformei: autentificare,
            menținerea sesiunii, coșul de cumpărături și procesarea plăților. Fără acestea, serviciile
            de bază nu pot funcționa corect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Cookie-uri de performanță</h2>
          <p>
            Cookie-urile de performanță urmăresc modul în care utilizați platforma în timpul vizitei,
            fără a colecta informații personale. Informațiile sunt anonimizate și agregate, ajutându-ne
            să înțelegem tiparele de utilizare și să îmbunătățim experiența generală.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Cookie-uri de funcționalitate</h2>
          <p>
            Cookie-urile de funcționalitate colectează informații despre dispozitivul dvs. și setările
            configurate (ex. preferințe de limbă, fus orar). Cu aceste informații, vă putem oferi
            conținut personalizat și optimizat. Folosim cookie-uri de funcționalitate pentru
            funcțiile selectate ale platformei.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cookie-uri terțe</h2>
          <p>
            Putem angaja servicii terțe pe platforma noastră — de exemplu, procesatori de plăți (Stripe)
            sau furnizori de analiticale. Aceste servicii pot seta propriile cookie-uri. Întrucât nu avem
            control asupra cookie-urilor terților, acestea nu sunt acoperite integral de prezenta politică.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cum puteți controla cookie-urile?</h2>
          <p>
            Dacă nu doriți să acceptați cookie-uri, puteți instrui browserul dvs. să le refuze.
            Majoritatea browserelor acceptă cookie-urile implicit, dar puteți modifica aceste setări
            pentru a le refuza total sau pentru a fi notificat când un site încearcă să seteze un cookie.
          </p>
          <p className="mt-2">
            Dacă navigați de pe mai multe dispozitive, este necesar să actualizați setările pe fiecare
            în parte. Blocarea tuturor cookie-urilor poate împiedica accesul la anumite funcționalități
            ale platformei.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Contact</h2>
          <p>
            Pentru orice întrebări legate de utilizarea cookie-urilor, ne puteți contacta la:{' '}
            <a href="mailto:privacy@inovatrium.ro" className="text-blue-600 hover:underline">
              privacy@inovatrium.ro
            </a>
          </p>
        </section>

      </div>
    </div>
  );
}
