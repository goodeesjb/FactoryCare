import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Factory, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import axiosInstance from '../api/axiosInstance'

type LoginForm = { loginId: string; password: string }

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>()

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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Factory className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">FactoryCare</span>
        </Link>

        <div className="panel p-6">
          <h1 className="text-xl font-semibold tracking-tight">현장 계정으로 로그인</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            설비 점검·고장 이력 데이터에 접근하려면 인증이 필요합니다.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">아이디</span>
              <input
                {...register('loginId', { required: '아이디를 입력하세요.' })}
                placeholder="아이디를 입력하세요"
                autoComplete="username"
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"
              />
              {errors.loginId && <p className="mt-1 text-xs text-destructive">{errors.loginId.message}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">비밀번호</span>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  {...register('password', { required: '비밀번호를 입력하세요.' })}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  className="h-10 w-full rounded-md border border-input bg-card px-3 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </label>

            {errors.root && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← 메인 화면으로</Link>
        </p>
      </div>
    </div>
  )
}
