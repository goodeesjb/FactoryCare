import axiosInstance from './axiosInstance'
import type {
  MaintenanceTask,
  MaintenanceCreateRequest,
  MaintenanceUpdateRequest,
  MaintenanceAssignRequest,
  MaintenanceStartRequest,
  MaintenanceCompleteRequest,
  MaintenanceSearchParams,
  SpringPage,
} from '../types/maintenance'

export const maintenanceApi = {
  search: (params?: MaintenanceSearchParams) =>
    axiosInstance.get<SpringPage<MaintenanceTask>>('/maintenance', { params }).then(r => r.data),

  getById: (id: number) =>
    axiosInstance.get<MaintenanceTask>(`/maintenance/${id}`).then(r => r.data),

  create: (data: MaintenanceCreateRequest) =>
    axiosInstance.post<MaintenanceTask>('/maintenance', data).then(r => r.data),

  update: (id: number, data: MaintenanceUpdateRequest) =>
    axiosInstance.patch<MaintenanceTask>(`/maintenance/${id}`, data).then(r => r.data),

  assign: (id: number, data: MaintenanceAssignRequest) =>
    axiosInstance.patch<MaintenanceTask>(`/maintenance/${id}/assign`, data).then(r => r.data),

  start: (id: number, data: MaintenanceStartRequest) =>
    axiosInstance.post<MaintenanceTask>(`/maintenance/${id}/start`, data).then(r => r.data),

  complete: (id: number, data: MaintenanceCompleteRequest) =>
    axiosInstance.post<MaintenanceTask>(`/maintenance/${id}/complete`, data).then(r => r.data),

  cancel: (id: number) =>
    axiosInstance.patch<MaintenanceTask>(`/maintenance/${id}/cancel`).then(r => r.data),

  delete: (id: number) =>
    axiosInstance.delete(`/maintenance/${id}`),
}
