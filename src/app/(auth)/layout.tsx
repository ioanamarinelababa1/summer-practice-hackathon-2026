import { Trophy, Dumbbell, Target, Activity, Zap } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      {/* Left panel — 30% green gradient */}
      <div
        className="hidden lg:flex lg:w-[30%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(155deg, #15803d 0%, #166534 100%)' }}
      >
        {/* Decorative background rings */}
        <div className="absolute top-10 right-8 h-24 w-24 rounded-full border border-white/20" />
        <div className="absolute top-28 left-6 h-10 w-10 rounded-full border border-white/15" />
        <div className="absolute bottom-20 right-5 h-32 w-32 rounded-full border border-white/15" />
        <div className="absolute bottom-44 left-10 h-7 w-7 rounded-full bg-white/10" />
        <div className="absolute top-1/2 -right-12 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute top-1/4 -left-10 h-28 w-28 rounded-full bg-white/5" />

        {/* Brand content */}
        <div className="relative z-10 flex flex-col items-center px-8 text-center">
          {/* Logo mark */}
          <div className="animate-fade-in-up mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <Activity className="h-8 w-8 text-white" strokeWidth={1.75} />
          </div>

          <h1 className="animate-fade-in-up text-3xl font-bold tracking-tight text-white">
            ShowUp2Move
          </h1>

          <p className="animate-fade-in-up-delay mt-4 text-base leading-relaxed text-white/75">
            Find your people.<br />Play your sport.<br />Show up.
          </p>

          {/* Sport icon row */}
          <div className="animate-fade-in-up-late mt-12 flex gap-4">
            {[Trophy, Dumbbell, Target, Zap].map((Icon, i) => (
              <div
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
              >
                <Icon className="h-5 w-5 text-white/80" strokeWidth={1.75} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — 70% white */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
