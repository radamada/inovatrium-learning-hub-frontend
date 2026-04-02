import Link from 'next/link';

export const metadata = {
  title: 'Politică de Confidențialitate — EduInovatrium',
  description: 'Politica de confidențialitate și protecție a datelor personale pe platforma EduInovatrium.',
};

export default function ConfidentialitatePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Politică de Confidențialitate</h1>
      <p className="text-sm text-gray-400 mb-8">Ultima actualizare: 30 martie 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

        <p>
          Confidențialitatea ta este importantă pentru noi. <strong>EduInovatrium</strong> se angajează
          să îți respecte datele cu caracter personal și să respecte orice lege și reglementare
          aplicabilă privind datele pe care le colectăm prin intermediul platformei{' '}
          <strong>eduinovatrium.ro</strong>, inclusiv Regulamentul General privind Protecția Datelor
          (GDPR — Regulamentul UE 2016/679).
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Cine suntem</h2>
          <p>
            EduInovatrium (<strong>eduinovatrium.ro</strong>) este operatorul datelor tale cu caracter
            personal. Ne poți contacta la:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Email: <a href="mailto:privacy@eduinovatrium.ro" className="text-indigo-600 hover:underline">privacy@eduinovatrium.ro</a></li>
            <li>Formular de contact: <Link href="/contact" className="text-indigo-600 hover:underline">eduinovatrium.ro/contact</Link></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Informațiile pe care le colectăm</h2>
          <p>
            Prin utilizarea Platformei, putem colecta automat anumite informații standard transmise de
            browser-ul tău: adresa IP, tipul și versiunea browser-ului, paginile vizitate, ora și data
            vizitei, durata sesiunii.
          </p>
          <p className="mt-2">Colectăm de asemenea informații personale pe care ni le furnizezi direct:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Date de cont:</strong> nume, adresă de email, parolă (stocată criptat cu bcrypt — noi nu avem acces la parola ta)</li>
            <li><strong>Date de plată:</strong> procesate integral de Stripe — EduInovatrium nu stochează datele de card</li>
            <li><strong>Date de utilizare:</strong> cursuri achiziționate, progres lecții, ultima accesare, recenzii lăsate</li>
            <li><strong>Date tehnice:</strong> adresă IP, tip browser, sistem de operare (colectate automat la fiecare vizită)</li>
            <li><strong>Consimțăminte:</strong> data, ora și versiunea termenilor acceptați la înregistrare</li>
          </ul>
          <p className="mt-2">
            Nu colectăm date sensibile (origine rasială, opinii politice, date de sănătate etc.) și nu
            solicităm niciodată datele de card direct pe Platformă.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Bazele legale pentru prelucrarea datelor</h2>
          <p>Prelucrăm datele tale personal în mod legal, echitabil și transparent, în baza:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>
              <strong>Executarea contractului</strong> — pentru furnizarea accesului la Cursurile
              achiziționate, procesarea plăților și gestionarea contului tău
            </li>
            <li>
              <strong>Consimțământ</strong> — pentru trimiterea de newsletter sau comunicări de
              marketing, dacă ai optat pentru acestea; poți retrage consimțământul oricând
            </li>
            <li>
              <strong>Obligație legală</strong> — pentru păstrarea documentelor fiscale și conformarea
              cu legislația aplicabilă
            </li>
            <li>
              <strong>Interes legitim</strong> — pentru securitatea Platformei, prevenirea fraudei și
              îmbunătățirea serviciilor noastre
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cum folosim datele tale</h2>
          <p>Utilizăm informațiile colectate pentru:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Crearea și gestionarea contului tău de utilizator</li>
            <li>Furnizarea accesului la Cursurile achiziționate</li>
            <li>Procesarea plăților și emiterea documentelor fiscale</li>
            <li>Trimiterea confirmărilor de comandă și a notificărilor legate de cont</li>
            <li>Urmărirea progresului tău în cadrul Cursurilor</li>
            <li>Răspunsul la solicitările de asistență</li>
            <li>Îmbunătățirea Platformei prin analiza anonimizată a utilizării</li>
            <li>Prevenirea fraudei și asigurarea securității Platformei</li>
            <li>Respectarea obligațiilor legale (facturare, arhivare fiscală)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Dezvăluirea datelor către terți</h2>
          <p>
            Nu vindem și nu închiriem datele tale personale. Le partajăm doar cu partenerii necesari
            pentru furnizarea serviciilor:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>
              <strong>Stripe</strong> — procesarea plăților online (politica de confidențialitate:{' '}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">stripe.com/privacy</a>)
            </li>
            <li>
              <strong>Bunny.net</strong> — hosting și livrare conținut video prin CDN
            </li>
            <li>
              <strong>MongoDB Atlas</strong> — stocarea datelor în cloud (servere în UE, AWS)
            </li>
            <li>
              <strong>Furnizori SMTP</strong> — trimiterea emailurilor tranzacționale (confirmări, notificări)
            </li>
          </ul>
          <p className="mt-2">
            Toți partenerii noștri sunt selectați cu grijă și respectă cerințele GDPR. Cu fiecare
            procesator extern am încheiat acorduri de prelucrare a datelor (DPA).
          </p>
          <p className="mt-2">
            Putem dezvălui datele tale și autorităților competente dacă suntem obligați prin lege sau
            dacă este necesar pentru protejarea drepturilor noastre legale.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Transferuri internaționale de date</h2>
          <p>
            Datele tale sunt stocate preponderent pe servere localizate în Uniunea Europeană. În cazul
            unor transferuri în afara SEE (de ex. prin serviciile partenerilor), ne asigurăm că acestea
            sunt protejate prin mecanisme adecvate: clauze contractuale standard aprobate de Comisia
            Europeană sau alte garanții recunoscute.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookie-uri</h2>
          <p>Platforma utilizează cookie-uri pentru a îmbunătăți experiența ta:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>
              <strong>Cookie-uri esențiale</strong> — necesare pentru autentificare și funcționarea
              Platformei; nu pot fi dezactivate
            </li>
            <li>
              <strong>Cookie-uri de sesiune</strong> — șterse automat la închiderea browser-ului
            </li>
            <li>
              <strong>Cookie-uri persistente</strong> (ex. refresh token) — expiră în 7 zile
            </li>
            <li>
              <strong>Cookie-uri analitice</strong> — folosite pentru înțelegerea modului de utilizare
              a Platformei, în formă anonimizată
            </li>
          </ul>
          <p className="mt-2">
            Nu folosim cookie-uri de tracking pentru publicitate terță. Poți gestiona preferințele de
            cookie-uri din{' '}
            <Link href="/politica-cookies" className="text-indigo-600 hover:underline">
              Politica Cookies
            </Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Drepturile tale</h2>
          <p>Conform GDPR, beneficiezi de următoarele drepturi:</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Dreptul de acces</strong> — poți solicita o copie a datelor personale pe care le deținem despre tine</li>
            <li><strong>Dreptul la rectificare</strong> — poți solicita corectarea datelor incorecte sau incomplete</li>
            <li><strong>Dreptul la ștergere ("dreptul de a fi uitat")</strong> — poți solicita ștergerea contului și a datelor tale, în condițiile legii</li>
            <li><strong>Dreptul la restricționarea prelucrării</strong> — poți solicita limitarea prelucrării datelor tale în anumite circumstanțe</li>
            <li><strong>Dreptul la portabilitate</strong> — poți primi datele tale într-un format structurat, lizibil automat</li>
            <li><strong>Dreptul de opoziție</strong> — poți refuza prelucrarea datelor în scop de marketing direct</li>
            <li><strong>Dreptul de retragere a consimțământului</strong> — oricând, fără costuri și fără a afecta legalitatea prelucrărilor anterioare</li>
          </ul>
          <p className="mt-2">
            Pentru exercitarea oricărui drept, contactează-ne la{' '}
            <a href="mailto:privacy@eduinovatrium.ro" className="text-indigo-600 hover:underline">
              privacy@eduinovatrium.ro
            </a>. Răspundem în maxim <strong>30 de zile</strong> calendaristice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Retenția datelor</h2>
          <p>
            Nu păstrăm datele tale mai mult decât este necesar scopului pentru care au fost colectate:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Date de cont și de utilizare:</strong> pe durata utilizării Platformei și 3 ani după ultima activitate</li>
            <li><strong>Date fiscale (facturi, comenzi):</strong> 10 ani, conform legislației române</li>
            <li><strong>Date tehnice (logs):</strong> maxim 12 luni</li>
          </ul>
          <p className="mt-2">
            Poți solicita ștergerea contului oricând prin{' '}
            <Link href="/contact" className="text-indigo-600 hover:underline">formularul de contact</Link>.
            Datele fiscale vor fi păstrate în continuare conform obligațiilor legale.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Securitate</h2>
          <p>
            Implementăm măsuri tehnice și organizatorice adecvate pentru protecția datelor tale:
            comunicare criptată HTTPS, parole stocate prin bcrypt, token-uri JWT cu durată scurtă de
            viață, acces restricționat la baza de date. În cazul unui incident de securitate care
            afectează datele tale, te vom notifica în termenele prevăzute de GDPR (maxim 72 de ore
            față de autoritate, respectiv fără întârzieri nejustificate față de persoanele afectate).
          </p>
          <p className="mt-2">
            Nicio metodă de transmitere sau stocare electronică nu este 100% securizată. În caz de
            suspiciune de utilizare neautorizată a contului tău, te rugăm să ne contactezi imediat.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Modificări ale politicii</h2>
          <p>
            Putem actualiza această Politică de Confidențialitate periodic pentru a reflecta modificări
            ale serviciilor noastre sau cerințe legale. Te vom notifica prin email sau prin anunț
            prominent pe Platformă cu cel puțin 7 zile înainte de intrarea în vigoare a modificărilor
            semnificative. Continuarea utilizării Platformei după data modificării constituie acceptarea
            noii politici.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact și reclamații</h2>
          <p>
            Pentru orice întrebări sau solicitări privind datele tale personale:{' '}
            <a href="mailto:privacy@eduinovatrium.ro" className="text-indigo-600 hover:underline">
              privacy@eduinovatrium.ro
            </a>
          </p>
          <p className="mt-2">
            Dacă consideri că drepturile tale nu au fost respectate, ai dreptul să depui o plângere la
            autoritatea de supraveghere competentă din România:
          </p>
          <p className="mt-2">
            <strong>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)</strong><br />
            B-dul G-ral. Gheorghe Magheru nr. 28-30, sector 1, București<br />
            <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              www.dataprotection.ro
            </a>
          </p>
        </section>

      </div>
    </div>
  );
}
