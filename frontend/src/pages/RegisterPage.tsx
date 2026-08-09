import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'

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

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">⚙️</span>
          <h1 className="mt-3 text-2xl font-bold text-blue-400">FactoryCare</h1>
          <p className="mt-1 text-sm text-slate-400">계정 등록 (관리자 권한 필요)</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-lg font-semibold mb-6">계정 등록</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">아이디</label>
              <input
                {...register('loginId', {
                  required: '아이디를 입력하세요.',
                  minLength: { value: 4, message: '아이디는 4자 이상이어야 합니다.' },
                  maxLength: { value: 50, message: '아이디는 50자 이하여야 합니다.' },
                })}
                placeholder="아이디 (4~50자)"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.loginId && (
                <p className="text-red-400 text-xs mt-1">{errors.loginId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">이름</label>
              <input
                {...register('name', { required: '이름을 입력하세요.' })}
                placeholder="이름"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">역할</label>
              <select
                {...register('role', { required: '역할을 선택하세요.' })}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="text-red-400 text-xs mt-1">{errors.role.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">비밀번호</label>
              <input
                type="password"
                {...register('password', {
                  required: '비밀번호를 입력하세요.',
                  minLength: { value: 8, message: '비밀번호는 8자 이상이어야 합니다.' },
                })}
                placeholder="비밀번호 (8자 이상)"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                {...register('passwordConfirm', {
                  required: '비밀번호를 다시 입력하세요.',
                  validate: (v) => v === watch('password') || '비밀번호가 일치하지 않습니다.',
                })}
                placeholder="비밀번호 확인"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {errors.passwordConfirm && (
                <p className="text-red-400 text-xs mt-1">{errors.passwordConfirm.message}</p>
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
              {isSubmitting ? '등록 중...' : '계정 등록'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-blue-400 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
