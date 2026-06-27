import { useAppStore } from '@/lib/store'

const CURRENCY_LOCALE: Record<string, string> = {
  USD: 'en-US',
  EUR: 'es-ES',
  GBP: 'en-GB',
  MXN: 'es-MX',
  COP: 'es-CO',
  ARS: 'es-AR',
}

export function useFormatCurrency() {
  const currency = useAppStore((s) => s.currency)

  return (amount: number) => {
    const locale = CURRENCY_LOCALE[currency] || 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount)
  }
}

export function formatCurrency(amount: number): string {
  const currency = useAppStore.getState().currency
  const locale = CURRENCY_LOCALE[currency] || 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}
