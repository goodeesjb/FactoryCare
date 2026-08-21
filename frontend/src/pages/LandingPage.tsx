import { useNavigate } from 'react-router-dom'
import { Factory, ShieldCheck, BarChart3, Wrench, ClipboardList } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  const features = [
    { icon: Wrench, title: '설비 관리', desc: '설비 등록·상태 모니터링·이력 추적을 한 곳에서 관리합니다.' },
    { icon: ShieldCheck, title: '점검 관리', desc: '정기 점검 일정과 체크리스트를 체계적으로 운영합니다.' },
    { icon: BarChart3, title: '장애 대응', desc: '장애 접수부터 처리 완료까지 전 과정을 추적합니다.' },
    { icon: ClipboardList, title: '유지보수', desc: '정비 작업을 계획하고 완료 이력을 기록합니다.' },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Factory className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">FactoryCare</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          로그인
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-16 py-20">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground">
            <Factory className="size-3 text-primary" />
            스마트 설비 유지보수 플랫폼
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight text-foreground">
            공장 설비를<br/>
            <span className="text-primary">체계적으로</span> 관리하세요
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            설비 관리부터 장애 대응, 유지보수까지 하나의 플랫폼에서 효율적으로 관리하세요.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            시작하기 →
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full">
          {features.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-card border border-border rounded-xl p-5 text-left hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 FactoryCare. All rights reserved.
        </p>
      </main>
    </div>
  )
}
