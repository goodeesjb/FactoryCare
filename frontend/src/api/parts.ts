import axiosInstance from './axiosInstance'
import type {
  Part,
  PartUsage,
  PartCreateRequest,
  PartUpdateRequest,
  PartStockAdjustRequest,
  PartUsageCreateRequest,
  PartSearchParams,
  SpringPage,
} from '../types/parts'

export const partApi = {
  search: (params?: PartSearchParams) =>
    axiosInstance.get<SpringPage<Part>>('/parts', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<Part>(`/parts/${id}`).then((r) => r.data),

  getUsages: (id: number) =>
    axiosInstance.get<PartUsage[]>(`/parts/${id}/usages`).then((r) => r.data),

  create: (data: PartCreateRequest) =>
    axiosInstance.post<Part>('/parts', data).then((r) => r.data),

  update: (id: number, data: PartUpdateRequest) =>
    axiosInstance.patch<Part>(`/parts/${id}`, data).then((r) => r.data),

  adjustStock: (id: number, data: PartStockAdjustRequest) =>
    axiosInstance.patch<Part>(`/parts/${id}/stock`, data).then((r) => r.data),

  delete: (id: number) =>
    axiosInstance.delete(`/parts/${id}`),
}

export const partUsageApi = {
  list: (maintenanceId: number) =>
    axiosInstance.get<PartUsage[]>(`/maintenance/${maintenanceId}/parts`).then((r) => r.data),

  create: (maintenanceId: number, data: PartUsageCreateRequest) =>
    axiosInstance.post<PartUsage>(`/maintenance/${maintenanceId}/parts`, data).then((r) => r.data),

  delete: (maintenanceId: number, usageId: number) =>
    axiosInstance.delete(`/maintenance/${maintenanceId}/parts/${usageId}`),
}
