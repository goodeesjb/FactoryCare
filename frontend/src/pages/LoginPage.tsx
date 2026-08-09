import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'

type LoginForm = {
  loginId: string
  password: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await axiosInstance.post('/auth/login', data)
      localStorage.setItem('accessToken', res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('name', res.data.name)
      navigate('/dashboard')
    } catch {
      setError('root', { message: '아이디 또는 비밀번호가 올바르지 않습니다.' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">⚙️</span>
          <h1 className="mt-3 text-2xl font-bold text-blue-400">FactoryCare</h1>
          <p className="mt-1 text-sm text-slate-400">설비 유지보수 관리 시스템</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-lg font-semibold mb-6">로그인</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">아이디</label>
              <input
                {...register('loginId', { required: '아이디를 입력하세요.' })}
                autoComplete="username"
                placeholder="아이디를 입력하세요"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.loginId && (
                <p className="text-red-400 text-xs mt-1">{errors.loginId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">비밀번호</label>
              <input
                type="password"
                {...register('password', { required: '비밀번호를 입력하세요.' })}
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <div className="px-4 py-2.5 rounded-lg bg-red-900/30 border border-red-700 text-red-400 text-sm text-center">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          계정이 없으신가요?{' '}
          <Link to="/register" className="text-blue-400 hover:underline">
            계정 등록
          </Link>
        </p>
      </div>
    </div>
  )
}
