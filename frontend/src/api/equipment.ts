import axiosInstance from './axiosInstance'
import type {
  Equipment,
  EquipmentCreateRequest,
  EquipmentSearchParams,
  EquipmentStatusHistory,
  EquipmentType,
  EquipmentUpdateRequest,
  SpringPage,
  EquipmentStatus,
} from '../types/equipment'

export const equipmentTypeApi = {
  getAll: () =>
    axiosInstance.get<EquipmentType[]>('/equipment-types').then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    axiosInstance.post<EquipmentType>('/equipment-types', data).then((r) => r.data),

  update: (id: number, data: { name?: string; description?: string }) =>
    axiosInstance.patch<EquipmentType>(`/equipment-types/${id}`, data).then((r) => r.data),

  delete: (id: number) => axiosInstance.delete(`/equipment-types/${id}`),
}

export const equipmentApi = {
  search: (params: EquipmentSearchParams) =>
    axiosInstance
      .get<SpringPage<Equipment>>('/equipments', { params })
      .then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<Equipment>(`/equipments/${id}`).then((r) => r.data),

  create: (data: EquipmentCreateRequest) =>
    axiosInstance.post<Equipment>('/equipments', data).then((r) => r.data),

  update: (id: number, data: EquipmentUpdateRequest) =>
    axiosInstance.patch<Equipment>(`/equipments/${id}`, data).then((r) => r.data),

  delete: (id: number) => axiosInstance.delete(`/equipments/${id}`),

  changeStatus: (id: number, data: { newStatus: EquipmentStatus; reason: string }) =>
    axiosInstance.patch<Equipment>(`/equipments/${id}/status`, data).then((r) => r.data),

  getStatusHistories: (id: number) =>
    axiosInstance
      .get<EquipmentStatusHistory[]>(`/equipments/${id}/status-histories`)
      .then((r) => r.data),
}
