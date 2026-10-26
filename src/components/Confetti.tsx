export function burstConfetti() {
  const n = 80
  const container = document.createElement('div')
  container.style.position='fixed'; container.style.inset='0'; container.style.pointerEvents='none'; container.style.zIndex='9998'
  document.body.appendChild(container)
  for (let i=0;i<n;i++){
    const p = document.createElement('div')
    p.style.position='absolute'; p.style.left='50%'; p.style.top='40%'
    p.style.width='8px'; p.style.height='8px'; p.style.borderRadius='2px'
    p.style.background = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6'][i%5]
    const dx = (Math.random()-0.5)*600; const dy = (Math.random()-0.5)*400
    p.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(360deg)`,opacity:0}], {duration:900+Math.random()*400,easing:'cubic-bezier(.2,.8,.2,1)'})
    container.appendChild(p)
  }
  setTimeout(()=>container.remove(),1400)
}
