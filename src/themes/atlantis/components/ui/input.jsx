import React from 'react'

export function Input({ className = '', ...props }) {
  return <input className={`w-full px-4 ${className}`} {...props} />
}