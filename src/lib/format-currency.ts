import { useAppStore } from '@/lib/store'

export function useFormatCurrency() {
  const currency = useAppStore((s) => s.currency)

  return (amount: number) => {
    return formatWithDots(amount, currency)
  }
}

export function formatCurrency(amount: number): string {
  const currency = useAppStore.getState().currency
  return formatWithDots(amount, currency)
}

function formatWithDots(amount: number, currency: string) {
  // Use en-US to guarantee commas for thousands and dots for decimals
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
  
  // Swap commas and dots: replace ',' with 'X', '.' with ',', 'X' with '.'
  return formatted.replace(/,/g, 'X').replace(/\./g, ',').replace(/X/g, '.')
}
