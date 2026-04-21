import React from 'react'

export function Button({ className = '', variant = 'default', size, asChild = false, ...props }) {
  const base = 'inline-flex items-center justify-center transition focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed'
  const variants = {
    default: '',
    outline: '',
    ghost: '',
  }
  const Comp = asChild ? 'span' : 'button'
  return <Comp className={`${base} ${variants[variant] || ''} ${className}`} {...props} />
}