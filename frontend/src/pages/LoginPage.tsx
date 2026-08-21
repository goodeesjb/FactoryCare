import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Factory, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import axiosInstance from '../api/axiosInstance'

type Mode = 'login' | 'register'

type LoginForm = { loginId: string; password: string }
type RegisterForm = {
  loginId: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'WORKER'
  password: string
  passwordConfirm: string
}

const ROLE_LABELS = { ADMIN: '관리자', MANAGER: '매니저', WORKER: '작업자' } as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await axiosInstance.post('/auth/login', data)
      localStorage.setItem('accessToken', res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('name', res.data.name)
      onSuccess()
    } catch {
      setError('root', { message: '아이디 또는 비밀번호가 올바르지 않습니다.' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <Field label="아이디">
        <input
          {...register('loginId', { required: '아이디를 입력하세요.' })}
          placeholder="아이디를 입력하세요"
          autoComplete="username"
          className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"
        />
        {errors.loginId && <p className="mt-1 text-xs text-destructive">{errors.loginId.message}</p>}
      </Field>

      <Field label="비밀번호">
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
      </Field>

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
  )
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<RegisterForm>({ defaultValues: { role: 'WORKER' } })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await axiosInstance.post('/users', {
        loginId: data.loginId,
        password: data.password,
        name: data.name,
        role: data.role,
      })
      onSuccess()
    } catch (e: any) {
      const msg = e.response?.data?.message ?? '계정 등록에 실패했습니다.'
      setError('root', { message: msg })
    }
  }

  const inputCls = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <Field label="아이디">
        <input
          {...register('loginId', {
            required: '아이디를 입력하세요.',
            minLength: { value: 4, message: '4자 이상 입력하세요.' },
            maxLength: { value: 50, message: '50자 이하로 입력하세요.' },
          })}
          placeholder="아이디 (4~50자)"
          className={inputCls}
        />
        {errors.loginId && <p className="mt-1 text-xs text-destructive">{errors.loginId.message}</p>}
      </Field>

      <Field label="이름">
        <input
          {...register('name', { required: '이름을 입력하세요.' })}
          placeholder="이름"
          className={inputCls}
        />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </Field>

      <Field label="역할">
        <select {...register('role', { required: '역할을 선택하세요.' })} className={inputCls}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {errors.role && <p className="mt-1 text-xs text-destructive">{errors.role.message}</p>}
      </Field>

      <Field label="비밀번호">
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            {...register('password', {
              required: '비밀번호를 입력하세요.',
              minLength: { value: 8, message: '8자 이상 입력하세요.' },
            })}
            placeholder="비밀번호 (8자 이상)"
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-input bg-card px-3 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"
          />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
      </Field>

      <Field label="비밀번호 확인">
        <div className="relative">
          <input
            type={showPwConfirm ? 'text' : 'password'}
            {...register('passwordConfirm', {
              required: '비밀번호를 다시 입력하세요.',
              validate: v => v === watch('password') || '비밀번호가 일치하지 않습니다.',
            })}
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-input bg-card px-3 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"
          />
          <button type="button" onClick={() => setShowPwConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPwConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.passwordConfirm && <p className="mt-1 text-xs text-destructive">{errors.passwordConfirm.message}</p>}
      </Field>

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
        {isSubmitting ? '등록 중...' : '계정 등록'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')

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
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-sm px-3 py-2 text-sm transition-colors ${
                  mode === m
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? '로그인' : '계정 등록'}
              </button>
            ))}
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            {mode === 'login' ? '현장 계정으로 로그인' : '새 현장 계정 등록'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'login'
              ? '설비 점검·고장 이력 데이터에 접근하려면 인증이 필요합니다.'
              : '계정 등록은 관리자(ADMIN) 권한이 필요합니다.'}
          </p>

          {mode === 'login'
            ? <LoginForm onSuccess={() => navigate('/dashboard')} />
            : <RegisterForm onSuccess={() => setMode('login')} />
          }
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← 메인 화면으로</Link>
        </p>
      </div>
    </div>
  )
}
