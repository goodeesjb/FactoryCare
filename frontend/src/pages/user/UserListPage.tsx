import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, X } from 'lucide-react'
import { userApi } from '../../api/users'
import { USER_ROLE_LABELS } from '../../types/users'
import type { UserResponse, UserRole } from '../../types/users'

const ROLE_OPTIONS: UserRole[] = ['ADMIN', 'MANAGER', 'WORKER']

const roleBadgeCls = (role: UserRole) => {
  if (role === 'ADMIN') return 'bg-red-100 text-red-700'
  if (role === 'MANAGER') return 'bg-blue-100 text-blue-700'
  return 'bg-green-100 text-green-700'
}

type RegisterForm = {
  loginId: string
  name: string
  role: UserRole
  password: string
  passwordConfirm: string
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const { register, handleSubmit, watch, setError, reset, formState: { errors, isSubmitting } } = useForm<RegisterForm>({ defaultValues: { role: 'WORKER' } })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await userApi.create({ loginId: data.loginId, password: data.password, name: data.name, role: data.role })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      onClose()
    } catch (e: any) {
      const status = e.response?.status
      const msg = status === 401 || status === 403
        ? '관리자(ADMIN) 권한이 필요합니다.'
        : e.response?.data?.message ?? '계정 등록에 실패했습니다.'
      setError('root', { message: msg })
    }
  }

  const inputCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">계정 등록</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">아이디</span>
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
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">이름</span>
            <input
              {...register('name', { required: '이름을 입력하세요.' })}
              placeholder="이름"
              className={inputCls}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">역할</span>
            <select {...register('role')} className={inputCls}>
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{USER_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">비밀번호</span>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                {...register('password', {
                  required: '비밀번호를 입력하세요.',
                  minLength: { value: 8, message: '8자 이상 입력하세요.' },
                })}
                placeholder="비밀번호 (8자 이상)"
                autoComplete="new-password"
                className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">비밀번호 확인</span>
            <div className="relative">
              <input
                type={showPwConfirm ? 'text' : 'password'}
                {...register('passwordConfirm', {
                  required: '비밀번호를 다시 입력하세요.',
                  validate: v => v === watch('password') || '비밀번호가 일치하지 않습니다.',
                })}
                placeholder="비밀번호 확인"
                autoComplete="new-password"
                className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:border-ring transition-colors"
              />
              <button type="button" onClick={() => setShowPwConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.passwordConfirm && <p className="mt-1 text-xs text-destructive">{errors.passwordConfirm.message}</p>}
          </label>

          {errors.root && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-md border border-border text-sm hover:bg-muted transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '등록 중...' : '계정 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const myRole = localStorage.getItem('role')

  if (myRole !== 'ADMIN') {
    navigate('/dashboard')
    return null
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.list,
  })

  const [registerOpen, setRegisterOpen] = useState(false)
  const [roleModal, setRoleModal] = useState<{ open: boolean; user: UserResponse | null }>({ open: false, user: null })
  const [selectedRole, setSelectedRole] = useState<UserRole>('WORKER')
  const [deactivateId, setDeactivateId] = useState<number | null>(null)

  const changeRoleMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) => userApi.changeRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setRoleModal({ open: false, user: null })
    },
  })

  const deactivateMut = useMutation({
    mutationFn: (id: number) => userApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeactivateId(null)
    },
  })

  const openRoleModal = (user: UserResponse) => {
    setSelectedRole(user.role)
    setRoleModal({ open: true, user })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">불러오는 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">회원 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">전체 {users.length}명</p>
        </div>
        <button
          onClick={() => setRegisterOpen(true)}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          계정 등록
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">이름</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">로그인 ID</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">역할</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상태</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">가입일</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.loginId}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleBadgeCls(user.role)}`}>
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">활성</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">비활성</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => openRoleModal(user)}
                    disabled={!user.active}
                    className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    역할 변경
                  </button>
                  {user.active && (
                    <button
                      onClick={() => setDeactivateId(user.id)}
                      className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      비활성화
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 계정 등록 모달 */}
      {registerOpen && <RegisterModal onClose={() => setRegisterOpen(false)} />}

      {/* 역할 변경 모달 */}
      {roleModal.open && roleModal.user && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border p-6 w-80 shadow-xl">
            <h2 className="text-base font-semibold text-foreground mb-1">역할 변경</h2>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground">{roleModal.user.name}</span>{' '}({roleModal.user.loginId})
            </p>
            <div className="space-y-2 mb-6">
              {ROLE_OPTIONS.map((role) => (
                <label key={role} className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40 transition-colors">
                  <input type="radio" name="role" value={role} checked={selectedRole === role} onChange={() => setSelectedRole(role)} className="accent-primary" />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleBadgeCls(role)}`}>{USER_ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRoleModal({ open: false, user: null })} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">취소</button>
              <button
                onClick={() => changeRoleMut.mutate({ id: roleModal.user!.id, role: selectedRole })}
                disabled={changeRoleMut.isPending || selectedRole === roleModal.user.role}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {changeRoleMut.isPending ? '변경 중...' : '변경'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비활성화 확인 모달 */}
      {deactivateId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border p-6 w-80 shadow-xl">
            <h2 className="text-base font-semibold text-foreground mb-2">비활성화 확인</h2>
            <p className="text-sm text-muted-foreground mb-6">해당 계정을 비활성화하면 로그인이 불가능해집니다. 계속하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeactivateId(null)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">취소</button>
              <button
                onClick={() => deactivateMut.mutate(deactivateId)}
                disabled={deactivateMut.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {deactivateMut.isPending ? '처리 중...' : '비활성화'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
