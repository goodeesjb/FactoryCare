import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Factory, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import axiosInstance from '../api/axiosInstance'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-2">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FactoryCare</h1>
          <p className="text-slate-400 text-sm">설비 유지보수 관리 시스템</p>
        </div>
        <Card className="border-white/10 bg-white/5 backdrop-blur text-white">
          <CardHeader>
            <CardTitle className="text-white text-lg">로그인</CardTitle>
            <CardDescription className="text-slate-400">계정 정보를 입력해주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">아이디</label>
                <input
                  {...register('loginId', { required: '아이디를 입력하세요.' })}
                  placeholder="아이디를 입력하세요"
                  autoComplete="username"
                  className="w-full h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                />
                {errors.loginId && <p className="text-red-400 text-xs">{errors.loginId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    {...register('password', { required: '비밀번호를 입력하세요.' })}
                    placeholder="비밀번호를 입력하세요"
                    autoComplete="current-password"
                    className="w-full h-10 px-3 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
              </div>
              {errors.root && (
                <div className="px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-700/50 text-red-400 text-sm text-center">
                  {errors.root.message}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
