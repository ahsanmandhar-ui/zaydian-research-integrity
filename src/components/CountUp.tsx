import { useEffect, useState } from 'react'

export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let start = 0
    const end = Number(value) || 0
    const startTime = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - startTime) / duration)
      setN(Math.round(start + (end - start) * p))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, duration])
  return <span>{n}</span>
}
export default CountUp
