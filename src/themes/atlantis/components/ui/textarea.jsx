import React from 'react'

export function Textarea({ className = '', ...props }) {
  return <textarea className={`w-full px-4 py-3 ${className}`} {...props} />
}