'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Bookmark, BookmarkCheck, Share2, Search,
  Lightbulb, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Types ───────────────────────────────────────────────────────────────────

type TipCategory = 'Ahorro' | 'Inversión' | 'Presupuesto' | 'Deudas' | 'Educación Financiera'

interface FinancialTip {
  id: number
  title: string
  description: string
  extendedDescription: string
  category: TipCategory
  image: string
  readTime: string
  difficulty: 1 | 2 | 3
}

// ── Data ───────────────────────────────────────────────────────────────────

const tipsData: FinancialTip[] = [
  {
    id: 1,
    title: 'La Regla 50/30/20',
    description: 'Divide tus ingresos: 50% necesidades, 30% deseos, 20% ahorro.',
    extendedDescription:
      'La regla 50/30/20 es uno de los métodos más populares para organizar tus finanzas. El 50% de tus ingresos netos debe destinarse a necesidades básicas como renta, alimentación, transporte y servicios. El 30% a gastos discrecionales como entretenimiento, restaurantes y hobbies. El 20% restante debe ir directamente al ahorro, inversión o pago extra de deudas. Esta regla te da una estructura clara sin ser excesivamente restrictiva. Comienza calculando tu ingreso mensual neto y asigna cada dólar a una de estas tres categorías. Ajusta los porcentajes según tu situación, pero mantén al menos un 20% para ahorro.',
    category: 'Presupuesto',
    image: '/images/financial-tips.png',
    readTime: '3 min',
    difficulty: 1,
  },
  {
    id: 2,
    title: 'Fondo de Emergencia',
    description: 'Construye un fondo que cubra 3-6 meses de gastos esenciales.',
    extendedDescription:
      'Un fondo de emergencia es tu red de seguridad financiera. Debe cubrir entre 3 y 6 meses de tus gastos esenciales (no tu ingreso total). Para calcular el monto objetivo, suma todos tus gastos mensuales fijos y esenciales: renta, alimentación, servicios, seguros y transporte. Multiplica ese total por 3 como mínimo. Guarda este dinero en una cuenta de ahorro de fácil acceso que no esté vinculada a tu cuenta de cheques principal. Comienza pequeño: $500 ya es un excelente primer objetivo. Automatiza depósitos mensuales hasta alcanzar tu meta. No toques este fondo excepto en emergencias reales.',
    category: 'Ahorro',
    image: '/images/savings-illustration.png',
    readTime: '4 min',
    difficulty: 2,
  },
  {
    id: 3,
    title: 'Automatiza tus Ahorros',
    description: 'Configura transferencias automáticas el día de pago.',
    extendedDescription:
      'La automatización es el secreto de los ahorradores exitosos. En lugar de ahorrar lo que sobra al final del mes, programa una transferencia automática para el mismo día que recibes tu salario. "Págate a ti mismo primero" es el principio fundamental. Configura transferencias recurrentes desde tu cuenta de cheques a tu cuenta de ahorro. Puedes dividirlas: una porción para emergencias, otra para metas específicas y otra para inversión. La clave es que el dinero salga de tu cuenta antes de que puedas gastarlo. Muchas aplicaciones bancarias permiten crear reglas automáticas. Empieza con el 10% de tu ingreso y ve aumentando gradualmente.',
    category: 'Ahorro',
    image: '/images/savings-illustration.png',
    readTime: '3 min',
    difficulty: 1,
  },
  {
    id: 4,
    title: 'Elimina Deudas Caras',
    description: 'Prioriza deudas con interés más alto primero (método avalancha).',
    extendedDescription:
      'El método avalancha consiste en pagar el mínimo en todas tus deudas y destinar cualquier dinero extra a la deuda con la tasa de interés más alta. Esto minimiza el costo total de intereses a lo largo del tiempo. Por ejemplo, si tienes una tarjeta de crédito al 24%, un préstamo personal al 12% y un crédito educativo al 5%, enfoca todos los pagos extras en la tarjeta primero. Alternativamente, el método bola de nieve prioriza la deuda más pequeña para obtener victorias rápidas que te motiven. Elige el método que mejor se adapte a tu personalidad financiera. Lo importante es ser constante y no adquirir nuevas deudas mientras pagas las existentes.',
    category: 'Deudas',
    image: '/images/debt-freedom.png',
    readTime: '4 min',
    difficulty: 2,
  },
  {
    id: 5,
    title: 'La Regla de 72',
    description: 'Para saber cuánto tarda en duplicarse tu inversión.',
    extendedDescription:
      'La Regla de 72 es una fórmula simple para estimar cuántos años tomará duplicar tu dinero con una tasa de interés compuesto dada. Simplemente divide 72 entre la tasa de interés anual. Por ejemplo, si inviertes al 8% anual: 72 ÷ 8 = 9 años para duplicar tu inversión. Al 6%: 72 ÷ 6 = 12 años. Esta regla funciona mejor con tasas entre 4% y 12%. Es una herramienta excelente para entender el poder del interés compuesto y tomar decisiones de inversión informadas. También puedes usarla a la inversa: si quieres duplicar tu dinero en 6 años, necesitas una tasa de 72 ÷ 6 = 12% anual. Recuerda que los rendimientos reales deben considerar la inflación.',
    category: 'Inversión',
    image: '/images/financial-tips.png',
    readTime: '2 min',
    difficulty: 1,
  },
  {
    id: 6,
    title: 'Presupuesto Cero',
    description: 'Asigna cada dólar a una categoría antes de que empiece el mes.',
    extendedDescription:
      'El presupuesto base cero es un método donde tus ingresos menos tus gastos asignados deben ser exactamente cero. Esto no significa que gastas todo; significa que cada dólar tiene un propósito asignado. Al inicio de cada mes, lista todos tus ingresos esperados y asigna cada centavo a una categoría: gastos fijos, variables, ahorro, inversión y donaciones. Si ganas $3,000, debes planificar exactamente dónde irán los $3,000. Los dólares no asignados suelen terminar en gastos innecesarios. Usa una hoja de cálculo o una aplicación para rastrear tus asignaciones. Revisa y ajusta tu presupuesto semanalmente. Este método requiere más esfuerzo que otros, pero ofrece el máximo control sobre tu dinero.',
    category: 'Presupuesto',
    image: '/images/budget-planning.png',
    readTime: '5 min',
    difficulty: 3,
  },
  {
    id: 7,
    title: 'Invierte en Ti Mismo',
    description: 'La mejor inversión es tu educación y desarrollo profesional.',
    extendedDescription:
      'Invertir en ti mismo tiene el mayor retorno sobre inversión posible. Adquirir nuevas habilidades puede aumentar tu ingreso anual significativamente. Considera gastar en: cursos online, certificaciones profesionales, libros, conferencias de tu industria, networking, e incluso tu salud física y mental. Un curso de $200 que te ayuda a conseguir un aumento de $5,000 anuales tiene un ROI del 2,500%. Dedica al menos el 5% de tu ingreso a tu desarrollo personal. Aprende sobre finanzas, tecnología, comunicación y liderazgo. Las habilidades que adquieras hoy son las que determinarán tu valor en el mercado laboral mañana. El conocimiento compuesto es tan poderoso como el interés compuesto.',
    category: 'Educación Financiera',
    image: '/images/achievements.png',
    readTime: '3 min',
    difficulty: 1,
  },
  {
    id: 8,
    title: 'Evita Gastos Hormiga',
    description: 'Pequeños gastos diarios se acumulan enormemente con el tiempo.',
    extendedDescription:
      'Los gastos hormiga son esas pequeñas compras diarias que parecen insignificantes pero se acumulan de forma masiva. Un café de $5 cada día laboral equivale a $1,300 al año. Una botella de agua $2 diaria son $730 al año. Snacks, apps de suscripción baratas, recargos por cajero, propinas excesivas... todos suman. Regla práctica: cualquier gasto recurrente menor a $10 que no planificas es un gasto hormiga potencial. Para combatirlos: lleva un registro de todos tus gastos pequeños durante dos semanas, identifica patrones y busca alternativas. Prepara tu café en casa, lleva tu agua, planifica tus compras. Los $100-300 mensuales que puedes ahorrar eliminando gastos hormiga son una cifra considerable para tu futuro financiero.',
    category: 'Ahorro',
    image: '/images/savings-illustration.png',
    readTime: '3 min',
    difficulty: 1,
  },
  {
    id: 9,
    title: 'Revisa tus Suscripciones',
    description: 'Audita tus suscripciones mensuales y cancela las innecesarias.',
    extendedDescription:
      'El promedio de una persona tiene entre 8 y 12 suscripciones activas. Muchas de ellas se olvidan y continúan cobrándose mes a mes. Realiza una auditoría completa: revisa extractos bancarios de los últimos 3 meses y lista cada suscripción recurrente. Para cada una, pregúntate: ¿la usé en el último mes? ¿puedo vivir sin ella? ¿existe una alternativa gratuita? ¿puedo compartirla con alguien? Considera rotar suscripciones en lugar de mantenerlas todas activas: un mes de streaming A, el siguiente mes de streaming B. Esto puede ahorrarte entre $30 y $150 mensuales. Usa herramientas como un calendario para recordar renovaciones y evaluar cada suscripción antes de que se renueve automáticamente.',
    category: 'Presupuesto',
    image: '/images/budget-planning.png',
    readTime: '3 min',
    difficulty: 1,
  },
  {
    id: 10,
    title: 'Compra Inteligente',
    description: 'Compara precios y espera ofertas para compras grandes.',
    extendedDescription:
      'Comprar inteligentemente puede ahorrarte miles al año sin sacrificar calidad. Para compras mayores a $50, aplica la regla de las 24 horas: espera un día antes de comprar para evitar compras impulsivas. Para compras mayores a $200, espera una semana. Usa comparadores de precios en línea, activa alertas de precio, y compra en temporada baja. Los electrónicos son más baratos en noviembre y enero. La ropa al final de cada temporada. Los muebles en enero y julio. Aplica la regla del costo por uso: una chaqueta de $100 que usarás 200 veces cuesta $0.50 por uso, mientras que una de $30 que usarás 5 veces cuesta $6 por uso. Compra calidad sobre cantidad para artículos que usarás frecuentemente.',
    category: 'Ahorro',
    image: '/images/financial-tips.png',
    readTime: '4 min',
    difficulty: 1,
  },
  {
    id: 11,
    title: 'Diversifica Ingresos',
    description: 'No dependas de una sola fuente de ingresos.',
    extendedDescription:
      'La diversificación de ingresos es tan importante como la diversificación de inversiones. Tener una sola fuente de ingresos es un riesgo financiero significativo. Considera crear entre 3 y 7 fuentes de ingresos: tu empleo principal, un negocio secundario, ingresos por inversiones, freelancing, alquiler de activos, regalías o ingresos pasivos digitales. No necesitas que todas generen grandes cantidades; incluso $200-500 adicionales mensuales de una fuente secundaria marca una diferencia enorme. Comienza con tus habilidades actuales: ¿puedes ofrecer consultoría? ¿tienes un hobby monetizable? La clave es empezar pequeño, ser consistente y reinvertir los ingresos secundarios para que crezcan con el tiempo.',
    category: 'Inversión',
    image: '/images/financial-tips.png',
    readTime: '4 min',
    difficulty: 2,
  },
  {
    id: 12,
    title: 'Educación Financiera Continua',
    description: 'Dedica tiempo semanal a aprender sobre dinero e inversiones.',
    extendedDescription:
      'La educación financiera no es un evento único, es un proceso continuo. Dedica al menos 2 horas semanales a aprender sobre finanzas personales. Lee libros como "Padre Rico, Padre Pobre" de Robert Kiyosaki, "El Hombre Más Rico de Babilonia" de George Clason, o "Psicología del Dinero" de Morgan Housel. Sigue blogs financieros confiables, escucha podcasts de inversiones y toma cursos gratuitos en plataformas como Coursera o edX. Comprende conceptos clave: interés compuesto, inflación, diversificación, activos vs pasivos, y evaluación de riesgos. Únete a comunidades financieras donde puedas aprender de la experiencia de otros. La educación financiera es la inversión con menor riesgo y mayor retorno que existe.',
    category: 'Educación Financiera',
    image: '/images/achievements.png',
    readTime: '3 min',
    difficulty: 1,
  },
]

// ── Category config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<TipCategory, { color: string; bg: string; border: string; badge: string }> = {
  Ahorro: {
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  },
  Inversión: {
    color: 'text-cyan-700 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-200 dark:border-cyan-800',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
  },
  Presupuesto: {
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  },
  Deudas: {
    color: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
  },
  'Educación Financiera': {
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
  },
}

const ALL_CATEGORIES: Array<TipCategory | 'Todos'> = [
  'Todos',
  'Ahorro',
  'Inversión',
  'Presupuesto',
  'Deudas',
  'Educación Financiera',
]

// ── Components ──────────────────────────────────────────────────────────────

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  const labels = ['Básico', 'Intermedio', 'Avanzado']
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex gap-1">
        {[1, 2, 3].map((d) => (
          <span
            key={d}
            className={cn(
              'inline-block w-2 h-2 rounded-full transition-colors',
              d <= level ? 'bg-emerald-500' : 'bg-muted-foreground/20'
            )}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">{labels[level - 1]}</span>
    </div>
  )
}

function FeaturedTipCard({ 
  tip,
  isBookmarked,
  onBookmark,
  onShare,
  isExpanded,
  onToggleExpand,
}: { 
  tip: FinancialTip
  isBookmarked: boolean
  onBookmark: () => void
  onShare: () => void
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const config = CATEGORY_CONFIG[tip.category]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden border-0 shadow-lg relative">
        {/* Gradient border wrapper */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-[2px]">
          <div className="w-full h-full rounded-[6px] bg-card" />
        </div>
        <CardContent className="relative p-0">
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <div className="md:w-2/5 lg:w-1/3 shrink-0">
              <div className="relative h-48 md:h-full min-h-[220px]">
                <img
                  src={tip.image}
                  alt={tip.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/80 hidden md:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent md:hidden" />
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <Badge className={cn('w-fit mb-3', config.badge)}>{tip.category}</Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-500 shrink-0" />
                {tip.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {isExpanded ? tip.extendedDescription : tip.description}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{tip.readTime} lectura</span>
                  </div>
                  <DifficultyDots level={tip.difficulty} />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-primary hover:text-primary font-medium"
                    onClick={onToggleExpand}
                  >
                    {isExpanded ? (
                      <>Ver menos <ChevronUp className="w-3.5 h-3.5 ml-1" /></>
                    ) : (
                      <>Leer más <ChevronDown className="w-3.5 h-3.5 ml-1" /></>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onBookmark}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={onShare}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TipCard({
  tip,
  isBookmarked,
  onBookmark,
  onShare,
  isExpanded,
  onToggleExpand,
}: {
  tip: FinancialTip
  isBookmarked: boolean
  onBookmark: () => void
  onShare: () => void
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const config = CATEGORY_CONFIG[tip.category]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className={cn(
        'h-full flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg border',
        config.border
      )}>
        {/* Image header */}
        <div className="relative h-36 shrink-0 overflow-hidden">
          <img
            src={tip.image}
            alt={tip.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
          {/* Category badge */}
          <Badge className={cn('absolute top-3 left-3', config.badge)}>
            {tip.category}
          </Badge>
          {/* Action buttons */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm hover:bg-white dark:hover:bg-black/80 shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                onBookmark()
              }}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <Bookmark className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="sr-only">Guardar</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm hover:bg-white dark:hover:bg-black/80 shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                onShare()
              }}
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <span className="sr-only">Compartir</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <CardContent className="flex-1 flex flex-col p-4 pt-3">
          <h3 className="text-base font-bold text-foreground mb-1.5 leading-snug">
            {tip.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            {isExpanded ? tip.extendedDescription : tip.description}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{tip.readTime}</span>
              </div>
              <DifficultyDots level={tip.difficulty} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-primary hover:text-primary font-medium"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <>
                  Ver menos <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
                </>
              ) : (
                <>
                  Leer más <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Main Module ─────────────────────────────────────────────────────────────

export default function TipsModule() {

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<TipCategory | 'Todos'>('Todos')
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // Featured tip is always the first one
  const featuredTip = tipsData[0]

  const filteredTips = useMemo(() => {
    const list = tipsData.filter((tip) => {
      const matchesCategory = activeCategory === 'Todos' || tip.category === activeCategory
      const matchesSearch =
        !searchQuery.trim() ||
        tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tip.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
    // Remove the featured tip from the grid when showing "Todos" and no search
    return activeCategory === 'Todos' && !searchQuery.trim() ? list.slice(1) : list
  }, [activeCategory, searchQuery])

  const toggleBookmark = (id: number) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast('Consejo eliminado de guardados')
      } else {
        next.add(id)
        toast.success('Consejo guardado correctamente')
      }
      return next
    })
  }

  const handleShare = (tip: FinancialTip) => {
    const text = `💰 ${tip.title}\n\n${tip.description}\n\n— Compartido desde AhorrApp`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Consejo copiado al portapapeles')
      }).catch(() => {
        toast.error('No se pudo copiar al portapapeles')
      })
    } else {
      toast.error('Tu navegador no soporta copiar al portapapeles')
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5">
          <Lightbulb className="w-7 h-7 text-amber-500" />
          Consejos Financieros
        </h1>
        <p className="text-muted-foreground mt-1.5">
          Consejos prácticos para mejorar tu salud financiera
        </p>
      </div>

      {/* ── Featured Tip ─────────────────────────────────────────────── */}
      {activeCategory === 'Todos' && !searchQuery.trim() && (
        <FeaturedTipCard 
          tip={featuredTip}
          isBookmarked={bookmarkedIds.has(featuredTip.id)}
          onBookmark={() => toggleBookmark(featuredTip.id)}
          onShare={() => handleShare(featuredTip)}
          isExpanded={expandedIds.has(featuredTip.id)}
          onToggleExpand={() => toggleExpand(featuredTip.id)}
        />
      )}

      {/* ── Search & Filter Bar ──────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar consejos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat
            const config = cat !== 'Todos' ? CATEGORY_CONFIG[cat as TipCategory] : null
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border',
                  isActive
                    ? config
                      ? cn(config.badge, config.border)
                      : 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                )}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tips Grid ────────────────────────────────────────────────── */}
      {filteredTips.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground mb-1">No se encontraron consejos</p>
          <p className="text-sm text-muted-foreground">Intenta con otra búsqueda o categoría</p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredTips.map((tip) => (
              <TipCard
                key={tip.id}
                tip={tip}
                isBookmarked={bookmarkedIds.has(tip.id)}
                onBookmark={() => toggleBookmark(tip.id)}
                onShare={() => handleShare(tip)}
                isExpanded={expandedIds.has(tip.id)}
                onToggleExpand={() => toggleExpand(tip.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Bottom Stats ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {tipsData.length} consejos disponibles
        </span>
        <span className="flex items-center gap-1.5">
          <BookmarkCheck className="w-4 h-4 text-emerald-500" />
          {bookmarkedIds.size} guardados
        </span>
      </div>
    </div>
  )
}