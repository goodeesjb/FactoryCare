import { useNavigate } from 'react-router-dom'

const features = [
  {
    icon: '⚙️',
    title: '설비 관리',
    desc: '설비 등록부터 상태 관리까지. 현장 설비 정보를 한 곳에서 통합 관리합니다.',
  },
  {
    icon: '📋',
    title: '점검 관리',
    desc: '정기 점검 일정과 체크리스트를 자동화하여 놓치는 점검 없이 운영합니다.',
  },
  {
    icon: '🤖',
    title: 'AI 분석',
    desc: '축적된 데이터를 기반으로 반복 고장 패턴을 분석하고 유지보수를 추천합니다.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* 네비게이션 */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
        <span className="text-xl font-bold tracking-tight text-blue-400">
          FactoryCare
        </span>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          로그인
        </button>
      </nav>

      {/* 히어로 */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-10">
        <div className="flex flex-col items-center gap-4">
          <span className="text-5xl">⚙️</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            설비 유지보수,<br />
            <span className="text-blue-400">스마트하게 관리하세요</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            제조 현장의 설비 점검·고장·유지보수 이력을 통합 관리하고
            AI로 설비 상태를 분석합니다.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 font-semibold text-base transition-colors"
          >
            시작하기 →
          </button>
        </div>

        {/* 특징 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-slate-800 rounded-2xl p-6 text-left border border-slate-700 hover:border-blue-500 transition-colors"
            >
              <span className="text-3xl">{f.icon}</span>
              <h2 className="mt-3 text-lg font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="text-center py-4 text-xs text-slate-600">
        © 2026 FactoryCare
      </footer>
    </div>
  )
}
