// src/pages/LandingPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 font-sans">

      {/* --- HEADER is now global in App.tsx --- */}

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col justify-center pb-20">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[600px] w-[600px] rounded-full bg-emerald-500/20 blur-[120px] opacity-50" />
        <div className="absolute bottom-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px] opacity-30" />

        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-zinc-900/50 px-4 py-1.5 ring-1 ring-white/10 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_theme(colors.emerald.500)]" />
            <span className="text-sm font-medium text-zinc-300">
              La nueva forma de construir hábitos
            </span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl leading-[1.1]">
            <span className="bg-gradient-to-b from-white via-white to-zinc-400 bg-clip-text text-transparent">
              Domina tus rutinas,
            </span>
            <br />
            <span className="text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              desafía a tus amigos.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400">
            Ascendia no es solo otro tracker de hábitos. Es tu centro de comando para la disciplina social.
            Compara rachas, lanza retos y alcanza tu mejor versión acompañado.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto rounded-full bg-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all hover:scale-105 active:scale-95"
            >
              Crear cuenta gratis
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white ring-1 ring-zinc-800 hover:bg-zinc-800 transition-all"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-12 md:py-24 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-base font-semibold leading-7 text-emerald-400">Características</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Todo lo que necesitas para crecer
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '📊',
                title: 'Tracking Avanzado',
                desc: 'Visualiza tu progreso con gráficas detalladas, mapas de calor y estadísticas mensuales.',
                color: 'bg-emerald-500/10 text-emerald-400'
              },
              {
                icon: '🤝',
                title: 'Social & Amigos',
                desc: 'Sigue a tus amigos, celebra sus logros y mantén la motivación con la presión social positiva.',
                color: 'bg-indigo-500/10 text-indigo-400'
              },
              {
                icon: '🏆',
                title: 'Retos Competitivos',
                desc: 'Crea desafíos de 30 días. ¿Quién puede leer más? ¿Quién entrena más días? Compite y gana.',
                color: 'bg-rose-500/10 text-rose-400'
              }
            ].map((feature, i) => (
              <div key={i} className="group relative rounded-3xl bg-zinc-900 p-8 ring-1 ring-white/10 hover:ring-emerald-500/50 transition-all hover:-translate-y-1">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-2xl mb-6 ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-12 md:py-24 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Cómo funciona</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-zinc-800 via-emerald-500/50 to-zinc-800" />

            {[
              { step: '01', title: 'Crea tus hábitos', desc: 'Define qué quieres lograr. Ejercicio, lectura, meditación...' },
              { step: '02', title: 'Invita amigos', desc: 'Busca a tus amigos y conéctate para ver su progreso.' },
              { step: '03', title: 'Compite y gana', desc: 'Mantén la racha y sube en el ranking de tu grupo.' }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-zinc-900 border-4 border-zinc-950 ring-1 ring-emerald-500/30 flex items-center justify-center text-2xl font-bold text-emerald-400 z-10 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-zinc-400 max-w-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-12 md:py-24 bg-zinc-900/30">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {[
              { q: '¿Es Ascendia gratis?', a: 'Sí, Ascendia es completamente gratuito para uso personal y social básico.' },
              { q: '¿Puedo usarlo sin amigos?', a: '¡Claro! Ascendia funciona perfectamente como un tracker personal privado.' },
              { q: '¿Qué hace a Ascendia diferente de otros trackers de hábitos?', a: 'Ascendia no solo te ayuda a seguir tus hábitos, sino que introduce un fuerte componente social y competitivo, permitiéndote desafiar a tus amigos y subir en rankings.' },
            ].map((item, i) => (
              <details key={i} className="group rounded-2xl bg-zinc-900 ring-1 ring-white/5 open:ring-emerald-500/30">
                <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-zinc-200">
                  {item.q}
                  <span className="ml-4 transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="px-6 pb-6 text-zinc-400 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/5 bg-zinc-950 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Ascendia © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="/" className="hover:text-white transition-colors">Privacidad</a>
            <a href="/" className="hover:text-white transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}