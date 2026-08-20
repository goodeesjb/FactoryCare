import axiosInstance from './axiosInstance'
import type { UserResponse, UserCreateRequest, UserRole } from '../types/users'

export const userApi = {
  list: () => axiosInstance.get<UserResponse[]>('/users').then((r) => r.data),
  create: (data: UserCreateRequest) =>
    axiosInstance.post<UserResponse>('/users', data).then((r) => r.data),
  changeRole: (id: number, role: UserRole) =>
    axiosInstance.patch<UserResponse>(`/users/${id}/role`, { role }).then((r) => r.data),
  deactivate: (id: number) => axiosInstance.delete(`/users/${id}`),
}
