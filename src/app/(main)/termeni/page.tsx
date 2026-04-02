import Link from 'next/link';

export const metadata = {
  title: 'Termeni și Condiții — EduInovatrium',
  description: 'Termenii și condițiile de utilizare a platformei EduInovatrium.',
};

export default function TermeniPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Termeni și Condiții</h1>
      <p className="text-sm text-gray-400 mb-8">Ultima actualizare: 30 martie 2026</p>

      <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

        <p>
          Vizitarea, utilizarea și achiziționarea cursurilor de pe platforma{' '}
          <strong>EduInovatrium</strong> (<strong>eduinovatrium.ro</strong>) presupune acceptarea în
          totalitate a prezentelor Termeni și Condiții. Dacă nu ești de acord cu acești termeni, te
          rugăm să nu utilizezi platforma. EduInovatrium își rezervă dreptul de a modifica acești
          termeni în orice moment, modificările intrând în vigoare la data publicării pe această pagină.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Definiții</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Platformă</strong> — website-ul și serviciile disponibile la adresa eduinovatrium.ro.</li>
            <li><strong>Utilizator</strong> — orice persoană care accesează Platforma, indiferent dacă are sau nu un cont.</li>
            <li><strong>Client</strong> — Utilizatorul care efectuează o Comandă și achiziționează unul sau mai multe Cursuri.</li>
            <li><strong>Instructor</strong> — persoana care creează și publică conținut educațional pe Platformă, în baza unui acord cu EduInovatrium.</li>
            <li><strong>Curs</strong> — un produs digital (conținut video, materiale, exerciții) disponibil spre achiziție pe Platformă.</li>
            <li><strong>Comandă</strong> — solicitarea electronică prin care Clientul achiziționează unul sau mai multe Cursuri.</li>
            <li><strong>Contract</strong> — Comanda confirmată de EduInovatrium, prin care Clientul dobândește acces la Cursurile achiziționate.</li>
            <li><strong>Operator</strong> — EduInovatrium, societatea care administrează Platforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Descrierea serviciului</h2>
          <p>
            EduInovatrium este o platformă online de educație care permite Utilizatorilor să acceseze
            cursuri video preînregistrate, materiale de studiu și resurse educaționale create de
            Instructori verificați. Platforma oferă acces la conținut digital și nu implică livrarea
            unor produse fizice.
          </p>
          <p className="mt-2">
            EduInovatrium nu garantează că Platforma va fi disponibilă fără întreruperi și își rezervă
            dreptul de a suspenda temporar accesul pentru operații de mentenanță, cu sau fără
            notificarea prealabilă a Utilizatorilor.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Conturi de utilizator</h2>
          <p>
            Pentru a achiziționa și accesa Cursurile, Utilizatorul trebuie să creeze un cont pe
            Platformă. Prin crearea contului, Utilizatorul confirmă că are cel puțin 18 ani sau că
            deține acordul părintelui/tutorelui legal.
          </p>
          <p className="mt-2">Utilizatorul este responsabil pentru:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Furnizarea de informații corecte, complete și actualizate la înregistrare</li>
            <li>Menținerea confidențialității parolei și a datelor de autentificare</li>
            <li>Toate activitățile desfășurate prin intermediul contului său</li>
            <li>Notificarea imediată a EduInovatrium în cazul suspiciunii de acces neautorizat</li>
          </ul>
          <p className="mt-2">
            EduInovatrium își rezervă dreptul de a suspenda sau șterge fără preaviz conturile care
            încalcă prezentele Termeni și Condiții sau care sunt implicate în activități frauduloase.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Prețuri și plăți</h2>
          <p>
            Prețurile cursurilor sunt afișate în lei (RON) și includ TVA, acolo unde este aplicabil.
            EduInovatrium își rezervă dreptul de a modifica prețurile în orice moment; prețul aplicat
            Comenzii este cel afișat la momentul plasării acesteia.
          </p>
          <p className="mt-2">
            Plata se efectuează exclusiv online, prin intermediul procesorului de plăți{' '}
            <strong>Stripe</strong>. EduInovatrium nu stochează datele de card ale Clienților.
            Tranzacțiile sunt procesate în condiții de securitate conform standardului PCI-DSS.
          </p>
          <p className="mt-2">
            O Comandă este considerată finalizată după confirmarea plății de către procesatorul de
            plăți. Clientul va primi o confirmare pe adresa de email asociată contului.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Accesul la cursuri</h2>
          <p>
            Prin achiziționarea unui Curs, Clientul dobândește un drept de acces <strong>personal,
            netransferabil și nelimitat în timp</strong> la conținutul respectivului Curs, exclusiv
            pentru uz personal și necomercial.
          </p>
          <p className="mt-2">Este strict interzis:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Distribuirea, copierea sau republicarea conținutului Cursurilor</li>
            <li>Descărcarea videoclipsurilor sau a materialelor suport</li>
            <li>Partajarea datelor de autentificare cu alte persoane</li>
            <li>Utilizarea conținutului în scop comercial fără acordul scris al EduInovatrium</li>
            <li>Reproducerea sau crearea de materiale derivate din conținutul Cursurilor</li>
          </ul>
          <p className="mt-2">
            EduInovatrium poate revoca accesul la un Curs dacă detectează utilizarea abuzivă a
            contului sau încălcarea drepturilor de proprietate intelectuală.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Politica de rambursare</h2>
          <p>
            Clientul are dreptul de a solicita o rambursare completă în termen de{' '}
            <strong>14 zile calendaristice</strong> de la data achiziției, în conformitate cu
            prevederile OUG nr. 34/2014 privind drepturile consumatorilor.
          </p>
          <p className="mt-2">
            Rambursarea se procesează în maxim <strong>14 zile</strong> de la confirmarea solicitării,
            prin același mijloc de plată utilizat la achiziție. Odată procesată rambursarea, accesul
            la Curs va fi revocat.
          </p>
          <p className="mt-2">
            Cererile de rambursare se transmit la{' '}
            <a href="mailto:contact@eduinovatrium.ro" className="text-indigo-600 hover:underline">
              contact@eduinovatrium.ro
            </a>{' '}
            sau prin{' '}
            <Link href="/contact" className="text-indigo-600 hover:underline">
              formularul de contact
            </Link>
            , cu menționarea numărului Comenzii.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Proprietate intelectuală</h2>
          <p>
            Tot conținutul disponibil pe EduInovatrium — inclusiv cursuri video, texte, imagini,
            logo-uri, materiale grafice și denumiri comerciale — este protejat de drepturile de autor
            și aparține EduInovatrium sau Instructorilor licențiatori, conform Legii nr. 8/1996
            privind dreptul de autor și drepturile conexe.
          </p>
          <p className="mt-2">
            Utilizatorul are dreptul de a accesa conținutul exclusiv în scopul personal de învățare.
            Orice utilizare neautorizată a conținutului poate atrage răspunderea civilă și/sau penală
            a utilizatorului vinovat.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Conduita utilizatorilor</h2>
          <p>
            Utilizatorii Platformei se obligă să nu utilizeze serviciile EduInovatrium pentru activități
            ilegale, defăimătoare, obscene, amenințătoare sau care aduc atingere drepturilor altor
            persoane. Sunt interzise în mod expres:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Transmiterea de conținut spam, viruși sau cod malițios</li>
            <li>Utilizarea unor date de identificare false</li>
            <li>Accesarea neautorizată a sistemelor informatice ale Platformei</li>
            <li>Orice tentativă de manipulare a recenziilor sau a sistemului de evaluare</li>
          </ul>
          <p className="mt-2">
            Recenziile și comentariile lăsate pe Platformă trebuie să fie oneste și bazate pe
            experiența directă cu Cursul evaluat. EduInovatrium își rezervă dreptul de a șterge orice
            conținut care încalcă regulile de conduită.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Exonerarea de răspundere</h2>
          <p>
            EduInovatrium nu garantează că Platforma va funcționa fără erori, omisiuni sau
            întreruperi. Utilizatorul folosește Platforma pe propria răspundere. EduInovatrium nu va
            fi responsabilă pentru daune directe, indirecte, incidentale sau consecvente rezultate din:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Imposibilitatea temporară de acces la Platformă</li>
            <li>Erori tehnice sau de conținut în materialele Cursurilor</li>
            <li>Pierderea datelor sau accesului la cont din culpa Utilizatorului</li>
            <li>Utilizarea informațiilor din Cursuri în scopuri profesionale sau comerciale</li>
          </ul>
          <p className="mt-2">
            Responsabilitatea maximă a EduInovatrium față de un Client nu va depăși suma totală plătită
            de acesta pe Platformă în ultimele 12 luni.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Frauda</h2>
          <p>
            Orice tentativă de fraudă sau fraudă efectivă — inclusiv, dar fără a se limita la:
            accesarea neautorizată a conturilor altor Utilizatori, alterarea conținutului Platformei,
            atacuri informatice, utilizarea de date de plată furate sau tentative de obținere a
            accesului la Cursuri fără plata corespunzătoare — va fi raportată organelor abilitate și
            se va acționa în instanță conform legislației române în vigoare.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Soluționarea conflictelor. Legea aplicabilă</h2>
          <p>
            Prezentele Termeni și Condiții sunt guvernate de legislația română. Părțile vor depune
            toate eforturile pentru a soluționa pe cale amiabilă orice dispută apărută. În cazul în
            care soluționarea amiabilă nu este posibilă, litigiile vor fi supuse instanțelor judecătorești
            competente din România.
          </p>
          <p className="mt-2">
            Consumatorii pot utiliza și platforma europeană de soluționare online a litigiilor (SOL):{' '}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              ec.europa.eu/consumers/odr
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact</h2>
          <p>
            Pentru orice întrebări legate de acești termeni, ne poți contacta la{' '}
            <a href="mailto:legal@eduinovatrium.ro" className="text-indigo-600 hover:underline">
              legal@eduinovatrium.ro
            </a>{' '}
            sau prin{' '}
            <Link href="/contact" className="text-indigo-600 hover:underline">
              formularul de contact
            </Link>.
          </p>
        </section>

      </div>
    </div>
  );
}
