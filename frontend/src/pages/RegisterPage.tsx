import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import axiosInstance from '../api/axiosInstance'

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

export default function RegisterPage() {
  const navigate = useNavigate()
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
      navigate('/users')
    } catch (e: any) {
      const status = e.response?.status
      const msg = status === 401 || status === 403
        ? '계정 등록은 관리자(ADMIN) 권한이 필요합니다.'
        : e.response?.data?.message ?? '계정 등록에 실패했습니다.'
      setError('root', { message: msg })
    }
  }

  const inputCls = "h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">계정 등록</h1>
        <p className="text-sm text-muted-foreground mt-1">새 현장 계정을 등록합니다.</p>
      </div>

      <div className="panel p-6 max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm transition-colors hover:bg-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {isSubmitting ? '등록 중...' : '계정 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
