export type UserRole = 'ADMIN' | 'MANAGER' | 'WORKER'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: '관리자',
  MANAGER: '매니저',
  WORKER: '작업자',
}

export interface UserResponse {
  id: number
  loginId: string
  name: string
  role: UserRole
  active: boolean
  createdAt: string
}

export interface UserCreateRequest {
  loginId: string
  password: string
  name: string
  role: UserRole
}
