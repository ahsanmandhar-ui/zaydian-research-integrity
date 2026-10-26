import { useEffect, useState } from 'react'
export default function ToastHost() {
  const [items, setItems] = useState<{id:number;text:string}[]>([])
  useEffect(() => {
    const handler = (e:any) => setItems(prev => [...prev, { id: Date.now()+Math.random(), text: e.detail }])
    window.addEventListener('zri:toast', handler)
    return () => window.removeEventListener('zri:toast', handler)
  }, [])
  useEffect(() => {
    if (!items.length) return
    const t = setTimeout(() => setItems(prev => prev.slice(1)), 2600)
    return () => clearTimeout(t)
  }, [items])
  return (
    <div style={{position:'fixed',right:16,bottom:16,zIndex:9999,display:'grid',gap:8}}>
      {items.map(i=>(<div key={i.id} className="zri-card" style={{minWidth:220}}>{i.text}</div>))}
    </div>
  )
}
export function showToast(text:string){ window.dispatchEvent(new CustomEvent('zri:toast',{detail:text})) }
