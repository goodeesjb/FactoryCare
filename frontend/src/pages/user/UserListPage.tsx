import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../../api/users'
import { USER_ROLE_LABELS } from '../../types/users'
import type { UserResponse, UserRole } from '../../types/users'

const ROLE_OPTIONS: UserRole[] = ['ADMIN', 'MANAGER', 'WORKER']

const roleBadgeCls = (role: UserRole) => {
  if (role === 'ADMIN') return 'bg-red-100 text-red-700'
  if (role === 'MANAGER') return 'bg-blue-100 text-blue-700'
  return 'bg-green-100 text-green-700'
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

  const [roleModal, setRoleModal] = useState<{ open: boolean; user: UserResponse | null }>({
    open: false,
    user: null,
  })
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
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">회원 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">전체 {users.length}명</p>
        </div>
        <button
          onClick={() => navigate('/register')}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
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
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleBadgeCls(user.role)}`}
                  >
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                      활성
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                      비활성
                    </span>
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

      {/* 역할 변경 모달 */}
      {roleModal.open && roleModal.user && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border p-6 w-80 shadow-xl">
            <h2 className="text-base font-semibold text-foreground mb-1">역할 변경</h2>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-medium text-foreground">{roleModal.user.name}</span>
              {' '}({roleModal.user.loginId})
            </p>
            <div className="space-y-2 mb-6">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={() => setSelectedRole(role)}
                    className="accent-primary"
                  />
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleBadgeCls(role)}`}>
                    {USER_ROLE_LABELS[role]}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRoleModal({ open: false, user: null })}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={() =>
                  changeRoleMut.mutate({ id: roleModal.user!.id, role: selectedRole })
                }
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
            <p className="text-sm text-muted-foreground mb-6">
              해당 계정을 비활성화하면 로그인이 불가능해집니다. 계속하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeactivateId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
              >
                취소
              </button>
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
