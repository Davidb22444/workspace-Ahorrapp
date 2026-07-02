import type { CSSProperties, JSX } from 'react'

interface FinanceParticle {
  readonly id: number
  readonly left: number // posición horizontal en %
  readonly size: number // px
  readonly opacity: number
  readonly duration: number // s
  readonly delay: number // s
}

// Valores fijos (no Math.random) para evitar mismatches de hidratación SSR/CSR
const PARTICLES: readonly FinanceParticle[] = [
  { id: 1, left: 6, size: 4, opacity: 0.5, duration: 16, delay: 0 },
  { id: 2, left: 14, size: 3, opacity: 0.4, duration: 20, delay: 3 },
  { id: 3, left: 23, size: 5, opacity: 0.35, duration: 14, delay: 1.5 },
  { id: 4, left: 32, size: 3, opacity: 0.5, duration: 22, delay: 6 },
  { id: 5, left: 41, size: 4, opacity: 0.3, duration: 18, delay: 2 },
  { id: 6, left: 50, size: 3, opacity: 0.45, duration: 15, delay: 8 },
  { id: 7, left: 58, size: 5, opacity: 0.4, duration: 21, delay: 4 },
  { id: 8, left: 67, size: 3, opacity: 0.5, duration: 17, delay: 0.8 },
  { id: 9, left: 75, size: 4, opacity: 0.35, duration: 24, delay: 5 },
  { id: 10, left: 83, size: 3, opacity: 0.45, duration: 19, delay: 2.5 },
  { id: 11, left: 91, size: 5, opacity: 0.3, duration: 16, delay: 7 },
  { id: 12, left: 12, size: 3, opacity: 0.4, duration: 23, delay: 9 },
  { id: 13, left: 78, size: 4, opacity: 0.4, duration: 20, delay: 1 },
  { id: 14, left: 47, size: 3, opacity: 0.35, duration: 25, delay: 10 },
] as const

/** Estilo inline tipado para exponer la custom property --particle-opacity a las keyframes de CSS. */
interface ParticleStyle extends CSSProperties {
  '--particle-opacity'?: number
}

/**
 * Fondo animado global de AhorrApp.
 *
 * - `fixed inset-0 -z-10`: se monta una sola vez en el layout raíz y queda
 *   siempre detrás del contenido, sin afectar el flujo de `page.tsx`.
 * - `pointer-events-none`: no intercepta clics ni scroll.
 * - Solo anima `transform`/`opacity` → composición en GPU, sin JS por frame.
 * - Usa los tokens de color de `globals.css` (--chart-1, --chart-2, --chart-5,
 *   --foreground) para adaptarse automáticamente a light/dark.
 * - Respeta `prefers-reduced-motion` (ver bloque correspondiente en globals.css).
 * - Sin hooks ni estado: se puede renderizar en servidor, cero JS de cliente.
 */
export function FinanceBackground(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* Grid sutil tipo "papel de gráfico" */}
      <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] [background-image:linear-gradient(var(--foreground)_1px,transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] [background-size:48px_48px]" />

      {/* Manchas de gradiente que sugieren "zonas de crecimiento" */}
      <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,var(--chart-1)_0%,transparent_70%)] opacity-20 blur-3xl animate-finance-drift-1" />
      <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,var(--chart-5)_0%,transparent_70%)] opacity-15 blur-3xl animate-finance-drift-2" />
      <div className="absolute bottom-0 left-1/4 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,var(--chart-2)_0%,transparent_70%)] opacity-10 blur-3xl animate-finance-drift-3" />

      {/* Línea de tendencia ascendente, tipo gráfico de portafolio */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.12] dark:opacity-[0.18]"
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
      >
        <polyline
          points="0,650 150,600 300,620 450,500 600,540 750,380 900,420 1050,260 1200,300"
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="2"
          className="animate-finance-line-draw"
        />
      </svg>

      {/* Partículas ascendentes: sugieren ahorro/crecimiento constante */}
      {PARTICLES.map((p) => {
        const style: ParticleStyle = {
          left: `${p.left}%`,
          width: p.size,
          height: p.size,
          '--particle-opacity': p.opacity,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        }
        return (
          <span
            key={p.id}
            className="absolute bottom-[-20px] rounded-full bg-[var(--chart-1)] animate-finance-particle"
            style={style}
          />
        )
      })}
    </div>
  )
}

export default FinanceBackground
