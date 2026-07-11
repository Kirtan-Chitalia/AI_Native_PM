'use client'

import { useEffect, useState } from 'react'

export default function AnimatedNumber({ value, durationMs = 600 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])

  return <span className="animate-tick">{display}</span>
}
