import React, { useEffect, useState } from "react"
import { Input } from "./input"

interface AmountInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string | number
  onChange: (value: string) => void
}

export function AmountInput({ value, onChange, ...props }: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState("")

  useEffect(() => {
    if (value === "" || value === null || value === undefined) {
      setDisplayValue("")
      return
    }
    
    const strVal = value.toString()
    if (strVal === "") {
      setDisplayValue("")
      return
    }

    const parts = strVal.split('.')
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    // If the internal value has a decimal, format it with a comma
    const decimalPart = parts.length > 1 ? `,${parts[1]}` : ''
    
    // Prevent overriding if user is actively typing a comma (e.g. "120,")
    // If displayValue ends with ',' but value doesn't have a decimal yet, keep the comma
    if (displayValue.endsWith(',') && parts.length === 1) {
      setDisplayValue(`${integerPart},`)
    } else {
      setDisplayValue(`${integerPart}${decimalPart}`)
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value
    
    // Allow digits, dots, and commas
    raw = raw.replace(/[^0-9.,]/g, "")
    
    // Remove dots (used as thousands separator)
    let cleaned = raw.replace(/\./g, "")
    
    // Replace comma with dot (used as decimal separator internally)
    cleaned = cleaned.replace(/,/g, ".")

    // Ensure only one decimal dot
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // Update display immediately for responsive typing
    const outParts = cleaned.split('.')
    const integerPart = outParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    // Keep trailing comma or trailing zero after comma if typed
    const endsWithComma = raw.endsWith(',') || raw.endsWith('.')
    let decimalPart = ''
    if (outParts.length > 1) {
      decimalPart = `,${outParts[1]}`
    } else if (endsWithComma) {
      decimalPart = ','
    }
    
    setDisplayValue(`${integerPart}${decimalPart}`)
    
    // Send the raw parsable number string
    onChange(cleaned)
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  )
}
