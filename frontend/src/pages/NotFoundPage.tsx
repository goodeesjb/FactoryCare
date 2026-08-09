import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-blue-400">404</p>
        <h1 className="mt-4 text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-slate-400">요청하신 페이지가 존재하지 않습니다.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-8 px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 font-medium transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  )
}
