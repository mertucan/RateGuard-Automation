import { useEffect, useState } from 'react'

export default function SplashScreen({ children }) {
  const [phase, setPhase] = useState('splash')

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase('fade-out'), 1400)
    const timer2 = setTimeout(() => setPhase('done'), 1900)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  if (phase === 'done') return children

  return (
    <>
      {phase === 'fade-out' && <div className="hidden">{children}</div>}
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center bg-bg transition-opacity duration-500 ${
          phase === 'fade-out' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="splash-logo flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-soft">
            <span className="material-symbols-outlined filled text-5xl text-primary">security</span>
          </div>
          <div className="splash-text flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-text">RateGuard</span>
          </div>
          <div className="splash-spinner mt-2">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          </div>
        </div>
      </div>
    </>
  )
}
