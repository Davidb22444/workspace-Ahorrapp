'use client'

import React from 'react'
import styled from 'styled-components'

interface LogoutButtonProps {
  onClick: () => void | Promise<void>
  className?: string
  text?: string
  title?: string
}

const StyledWrapper = styled.div`
  .Btn {
    --btn-bg: var(--card);
    --btn-fg: var(--card-foreground);
    --btn-border: var(--border);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    width: auto;
    min-width: 45px;
    min-height: 45px;
    padding: 0 0.85rem;
    border: 1px solid var(--btn-border);
    border-radius: 0.5rem;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    background-color: var(--btn-bg);
    color: var(--btn-fg);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
    transition:
      transform 180ms ease,
      box-shadow 220ms ease,
      background-color 220ms ease,
      border-color 220ms ease,
      color 220ms ease;
  }

  .Btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    border-color: color-mix(in srgb, var(--btn-border) 55%, var(--primary) 45%);
  }

  .Btn:active {
    transform: translateY(0) scale(0.99);
  }

  .Btn:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
  }

  .sign {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .sign svg {
    width: 17px;
    height: 17px;
  }

  .sign svg path {
    fill: currentColor;
  }

  .text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1;
  }

  .logout-btn--collapsed {
    width: 45px;
    min-width: 45px;
    padding: 0;
    gap: 0;
  }

  .logout-btn--collapsed .text {
    display: none;
  }

  .logout-btn--sidebar {
    align-self: center;
  }

  .dark .Btn {
    --btn-bg: #0f172a;
    --btn-fg: #e2e8f0;
    --btn-border: rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  }

  .dark .Btn:hover {
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.38);
  }

  @media (hover: none), (pointer: coarse) {
    .Btn {
      width: 100%;
      min-height: 48px;
      justify-content: center;
      padding: 0 1rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .Btn {
      transition: none;
    }
  }
`

export default function LogoutButton({
  onClick,
  className,
  text = 'Logout',
  title = 'Cerrar sesión',
}: LogoutButtonProps) {
  return (
    <StyledWrapper>
      <button
        type="button"
        onClick={() => { void onClick() }}
        title={title}
        aria-label={title}
        className={`Btn${className ? ` ${className}` : ''}`}
      >
        <div className="sign" aria-hidden="true">
          <svg viewBox="0 0 512 512" focusable="false" aria-hidden="true">
            <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
          </svg>
        </div>
        <div className="text">{text}</div>
      </button>
    </StyledWrapper>
  )
}
