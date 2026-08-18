import { useNavigate } from 'react-router-dom'
import { Factory, ShieldCheck, BarChart3, Wrench } from 'lucide-react'
import { Button } from '../components/ui/button'

export default function LandingPage() {
  const navigate = useNavigate()
  const features = [
    { icon: Wrench, title: '설비관리', desc: '설비 등록, 상태 모니터링, 이력 추적' },
    { icon: ShieldCheck, title: '점검관리', desc: '정기 점검 일정 및 체크리스트 관리' },
    { icon: BarChart3, title: '장애·유지보수', desc: '장애 등록부터 유지보수 완료까지 추적' },
  ]
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Factory className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">FactoryCare</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => navigate('/login')}>로그인</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate('/register')}>시작하기</Button>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-16">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl font-bold tracking-tight leading-tight">스마트 공장 설비<br/>유지보수 플랫폼</h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">설비 관리부터 장애 대응, 유지보수까지 하나의 플랫폼에서 효율적으로 관리하세요.</p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90 px-8" onClick={() => navigate('/login')}>로그인하기</Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8" onClick={() => navigate('/register')}>계정 만들기</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-3xl w-full">
          {features.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-6 text-left hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
