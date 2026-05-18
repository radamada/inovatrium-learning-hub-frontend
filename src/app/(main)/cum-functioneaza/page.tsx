'use client';

import Link from 'next/link';
import { Search, ShoppingCart, PlayCircle, TrendingUp, CheckCircle, Star, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: Search,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    step: '01',
    title: 'Descoperă cursul potrivit',
    description:
      'Descoperă cursuri din domenii variate, create de profesioniști. Filtrează după categorie, nivel sau preț și găsește exact ce cauți.',
  },
  {
    icon: ShoppingCart,
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
    step: '02',
    title: 'Cumpără simplu și sigur',
    description:
      'Adaugă cursul în coș și finalizează comanda în câteva secunde. Plata este procesată securizat, iar accesul la curs este instant după confirmare.',
  },
  {
    icon: PlayCircle,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    step: '03',
    title: 'Învață în ritmul tău',
    description:
      'Accesează toate lecțiile video oricând, de pe orice dispozitiv. Nu există termene limită, înveți când vrei și în ritmul tău.',
  },
  {
    icon: TrendingUp,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    step: '04',
    title: 'Urmărește-ți progresul',
    description:
      'Monitorizează-ți progresul de învățare, vezi cât ai parcurs și continuă exact de unde ai rămas.',
  },
];

const features = [
  { icon: Clock, text: 'Acces nelimitat la cursurile cumpărate' },
  { icon: Users, text: 'Formatori cu experiență verificată' },
  { icon: Star, text: 'Recenzii de la studenți înrolați' },
  { icon: CheckCircle, text: 'Conținut actualizat constant de formatori' },
];

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

export default function CumFunctioneazaPage() {
  return (
    <div className="bg-white dark:bg-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-20 px-4 text-center">
        <motion.div
          className="max-w-3xl mx-auto"
          variants={heroStagger}
          initial="hidden"
          animate="show"
        >
          <motion.span
            variants={fadeUp}
            className="inline-block bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide"
          >
            Ghid rapid
          </motion.span>
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-5"
          >
            Cum funcționează <span className="text-blue-600 dark:text-blue-400">Inoversity</span>?
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-gray-500 dark:text-slate-400 max-w-xl mx-auto">
            De la descoperirea unui curs până la finalizarea lui — totul e simplu, rapid și la îndemâna ta.
          </motion.p>
        </motion.div>
      </section>

      {/* Steps */}
      <section className="max-w-5xl 3xl:max-w-[1400px] mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
              className="flex gap-5 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-default"
            >
              <motion.div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.2, type: 'spring', stiffness: 200 }}
              >
                <s.icon className="w-6 h-6" />
              </motion.div>
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pasul {s.step}</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">{s.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section className="bg-gray-50 dark:bg-slate-800/60 border-y border-gray-200 dark:border-slate-700 py-12 px-4">
        <div className="max-w-4xl 3xl:max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.text}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <f.icon className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 dark:text-slate-300">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <motion.div
          className="max-w-xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Gata să începi?</h2>
          <p className="text-gray-500 dark:text-slate-400 mb-8">
            Alătură-te miilor de studenți care învață zilnic pe Inoversity și dă-i un nou impuls carierei tale.
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold px-10 py-4 rounded-xl transition-colors text-base"
            >
              Explorează cursurile →
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
