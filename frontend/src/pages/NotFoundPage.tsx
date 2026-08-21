import { useNavigate } from 'react-router-dom'
import { Factory } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Factory className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight text-foreground">FactoryCare</span>
      </div>

      <div className="text-center">
        <p className="text-8xl font-bold text-primary/20 select-none">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="h-9 px-4 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            이전 페이지
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
