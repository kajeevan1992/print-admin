import React from 'react'

export function Badge({ className = '', ...props }) {
  return <div className={`inline-flex items-center ${className}`} {...props} />
}