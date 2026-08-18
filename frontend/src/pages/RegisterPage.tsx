import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { Factory, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import axiosInstance from '../api/axiosInstance'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'

type RegisterForm = {
  loginId: string
  password: string
  passwordConfirm: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'WORKER'
}

const ROLE_LABELS = {
  ADMIN: '관리자',
  MANAGER: '매니저',
  WORKER: '작업자',
} as const

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ defaultValues: { role: 'WORKER' } })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await axiosInstance.post('/users', {
        loginId: data.loginId,
        password: data.password,
        name: data.name,
        role: data.role,
      })
      navigate('/login')
    } catch (e: any) {
      const msg = e.response?.data?.message ?? '계정 등록에 실패했습니다.'
      setError('root', { message: msg })
    }
  }

  const inputClass = "w-full h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
  const selectClass = "w-full h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-2">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FactoryCare</h1>
          <p className="text-slate-400 text-sm">계정 등록 (관리자 권한 필요)</p>
        </div>
        <Card className="border-white/10 bg-white/5 backdrop-blur text-white">
          <CardHeader>
            <CardTitle className="text-white text-lg">계정 등록</CardTitle>
            <CardDescription className="text-slate-400">새 계정 정보를 입력해주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">아이디</label>
                <input
                  {...register('loginId', {
                    required: '아이디를 입력하세요.',
                    minLength: { value: 4, message: '아이디는 4자 이상이어야 합니다.' },
                    maxLength: { value: 50, message: '아이디는 50자 이하여야 합니다.' },
                  })}
                  placeholder="아이디 (4~50자)"
                  className={inputClass}
                />
                {errors.loginId && <p className="text-red-400 text-xs">{errors.loginId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">이름</label>
                <input
                  {...register('name', { required: '이름을 입력하세요.' })}
                  placeholder="이름"
                  className={inputClass}
                />
                {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">역할</label>
                <select
                  {...register('role', { required: '역할을 선택하세요.' })}
                  className={selectClass}
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="bg-slate-800 text-white">
                      {label}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="text-red-400 text-xs">{errors.role.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    {...register('password', {
                      required: '비밀번호를 입력하세요.',
                      minLength: { value: 8, message: '비밀번호는 8자 이상이어야 합니다.' },
                    })}
                    placeholder="비밀번호 (8자 이상)"
                    autoComplete="new-password"
                    className="w-full h-10 px-3 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">비밀번호 확인</label>
                <div className="relative">
                  <input
                    type={showPwConfirm ? 'text' : 'password'}
                    {...register('passwordConfirm', {
                      required: '비밀번호를 다시 입력하세요.',
                      validate: (v) => v === watch('password') || '비밀번호가 일치하지 않습니다.',
                    })}
                    placeholder="비밀번호 확인"
                    autoComplete="new-password"
                    className="w-full h-10 px-3 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowPwConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showPwConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.passwordConfirm && <p className="text-red-400 text-xs">{errors.passwordConfirm.message}</p>}
              </div>

              {errors.root && (
                <div className="px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-700/50 text-red-400 text-sm text-center">
                  {errors.root.message}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? '등록 중...' : '계정 등록'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">로그인</Link>
        </p>
      </div>
    </div>
  )
}
