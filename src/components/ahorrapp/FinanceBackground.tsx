'use client'

import React, { JSX, useEffect, useState } from 'react'

// Mascot text quotes list to make it interactive and playful!
const MASCOT_QUOTES = [
  "¡Cada centavo cuenta! 💰",
  "¿Ya registraste tus gastos de hoy? 📝",
  "¡Vamos a ganarle a la inflación! 🚀",
  "Ahorrar es como jugar, ¡y vas ganando! 🏆",
  "¡Un presupuesto ordenado es felicidad! ✨",
  "¡Ojo con los gastos hormiga! 🐜",
]

export function FinanceBackground(): JSX.Element {
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [showMascot, setShowMascot] = useState(true)

  // Rotate quotes every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MASCOT_QUOTES.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-background"
    >
      {/* Pattern Halftone en movimiento diagonal (definido en globals.css) */}
      <div className="bg-halftone-pattern" />

      {/* Formas decorativas flotantes retro/comic */}
      {/* 1. Estrella de 4 puntas en la esquina superior izquierda */}
      <div className="absolute top-[15%] left-[8%] w-16 h-16 opacity-15 animate-shape-1 text-yellow">
        <svg viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 0 C50 35, 65 50, 100 50 C65 50, 50 65, 50 100 C50 65, 35 50, 0 50 C35 50, 50 35, 50 0 Z" />
        </svg>
      </div>

      {/* 2. Círculo grande Coral en el centro derecho */}
      <div className="absolute top-[45%] right-[10%] w-24 h-24 rounded-full border-4 border-black bg-coral opacity-10 animate-shape-2" />

      {/* 3. Estrella Celeste en la parte inferior izquierda */}
      <div className="absolute bottom-[20%] left-[15%] w-12 h-12 opacity-15 animate-shape-3 text-celeste">
        <svg viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 0 C50 35, 65 50, 100 50 C65 50, 50 65, 50 100 C50 65, 35 50, 0 50 C35 50, 50 35, 50 0 Z" />
        </svg>
      </div>

      {/* 4. Blob morado en la esquina superior derecha */}
      <div className="absolute top-[10%] right-[15%] w-20 h-20 opacity-10 animate-shape-1 text-purple">
        <svg viewBox="0 0 100 100" fill="currentColor">
          <path d="M30,10 C50,0 80,20 90,40 C100,60 80,90 50,95 C20,100 0,80 5,50 C10,20 10,20 30,10 Z" />
        </svg>
      </div>

      {/* 5. Círculo Menta en la parte central izquierda */}
      <div className="absolute top-[30%] left-[25%] w-14 h-14 rounded-full border-4 border-black bg-mint opacity-10 animate-shape-2" />

      {/* Mascota Interactiva y Globo de diálogo (Fixed bottom-left para acompañar al usuario) */}
      {showMascot && (
        <div className="pointer-events-auto fixed bottom-5 left-5 z-40 hidden md:flex items-end gap-3 select-none">
          {/* Mascota SVG (Ahorrín, el Chanchito Moneda) */}
          <div className="w-20 h-20 animate-mascot relative cursor-pointer" onClick={() => setQuoteIndex((prev) => (prev + 1) % MASCOT_QUOTES.length)}>
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[4px_4px_0px_#000000]">
              {/* Cuerpo / Chanchito de Ahorro Coral/Menta */}
              <circle cx="50" cy="55" r="38" fill="#FF6B4A" stroke="#000000" strokeWidth="4" />
              
              {/* Orejitas */}
              <polygon points="18,28 10,12 30,22" fill="#FF6B4A" stroke="#000000" strokeWidth="4" />
              <polygon points="82,28 90,12 70,22" fill="#FF6B4A" stroke="#000000" strokeWidth="4" />
              
              {/* Ranura para Monedas */}
              <rect x="42" y="24" width="16" height="6" rx="2" fill="#000000" />
              
              {/* Hocico */}
              <ellipse cx="50" cy="65" rx="14" ry="10" fill="#FFCE3D" stroke="#000000" strokeWidth="4" />
              <circle cx="45" cy="65" r="2.5" fill="#000000" />
              <circle cx="55" cy="65" r="2.5" fill="#000000" />
              
              {/* Ojos simpáticos */}
              {/* Ojo Izquierdo */}
              <circle cx="36" cy="48" r="4" fill="#000000" />
              <circle cx="38" cy="46" r="1.5" fill="#FFFFFF" />
              {/* Ojo Derecho */}
              <circle cx="64" cy="48" r="4" fill="#000000" />
              <circle cx="66" cy="46" r="1.5" fill="#FFFFFF" />

              {/* Patitas */}
              <rect x="26" y="86" width="14" height="12" rx="4" fill="#FFCE3D" stroke="#000000" strokeWidth="4" />
              <rect x="60" y="86" width="14" height="12" rx="4" fill="#FFCE3D" stroke="#000000" strokeWidth="4" />
              
              {/* Colita en rulo */}
              <path d="M 85 65 Q 92 60 88 55" fill="none" stroke="#000000" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          {/* Globo de diálogo Comic */}
          <div className="relative bg-white text-black border-[3.5px] border-black rounded-[20px] p-3 max-w-[200px] shadow-[4px_4px_0px_#000000] font-sans text-xs font-bold leading-tight">
            {/* Triangulito indicador del globo */}
            <div className="absolute bottom-4 -left-[14px] w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-black border-b-[8px] border-b-transparent">
              <div className="absolute top-[-5.5px] right-[-14px] w-0 h-0 border-t-[6px] border-t-transparent border-r-[10px] border-r-white border-b-[6px] border-b-transparent" />
            </div>
            <p className="font-display text-[13px] text-coral mb-1 flex items-center gap-1">
              ¡Ahorrín dice!
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-mint animate-live-dot border border-black" />
            </p>
            <p className="text-gray-800">{MASCOT_QUOTES[quoteIndex]}</p>
            {/* Botón de cerrar globo */}
            <button 
              onClick={() => setShowMascot(false)} 
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-coral hover:bg-red-500 border-2 border-black flex items-center justify-center text-[10px] font-black text-black shadow-[1px_1px_0px_#000000] active:translate-y-[1px] active:shadow-none"
              title="Ocultar mascota"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinanceBackground
