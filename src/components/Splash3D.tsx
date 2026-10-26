export default function Splash3D() {
  return (
    <div className="splash-root">
      <style>{`
        .splash-root {
          position: fixed; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at 50% 45%, #0f172a, #020617 70%);
          color: #e2e8f0;
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
        }
        .splash-card {
          text-align: center;
          opacity: 0;
          transform: translateY(12px) scale(0.96);
          animation: splash-in 700ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }
        .splash-title {
          font-size: clamp(2rem, 5vw, 3.25rem);
          font-weight: 600;
          letter-spacing: -0.02em;
          margin: 0 0 0.5rem;
          line-height: 1.1;
        }
        .splash-sub {
          font-size: clamp(0.95rem, 2vw, 1.125rem);
          color: #93c5fd;
          margin: 0;
          opacity: 0;
          animation: splash-sub 900ms cubic-bezier(0.23, 1, 0.32, 1) 120ms forwards;
        }
        .splash-glow {
          position: absolute; width: 40vmin; height: 40vmin;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.18), transparent 70%);
          filter: blur(20px);
          animation: glow 6s ease-in-out infinite alternate;
          pointer-events: none;
        }
        @keyframes splash-in {
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splash-sub {
          to { opacity: 1; }
        }
        @keyframes glow {
          from { transform: translate(-50%, -50%) scale(1); }
          to { transform: translate(-50%, -50%) scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-card, .splash-sub { animation: none; opacity: 1; transform: none; }
          .splash-glow { animation: none; }
        }
      `}</style>
      <div className="splash-glow" style={{ left: '50%', top: '50%' }} />
      <div className="splash-card">
        <h1 className="splash-title">Zaydian Research Integrity</h1>
        <p className="splash-sub">Hive Mind</p>
      </div>
    </div>
  )
}