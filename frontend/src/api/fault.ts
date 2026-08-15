import axiosInstance from './axiosInstance'
import type {
  Fault,
  FaultCreateRequest,
  FaultUpdateRequest,
  FaultStatusChangeRequest,
  FaultAssignRequest,
  FaultSearchParams,
  SpringPage,
} from '../types/fault'

export const faultApi = {
  search: (params?: FaultSearchParams) =>
    axiosInstance.get<SpringPage<Fault>>('/faults', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<Fault>(`/faults/${id}`).then((r) => r.data),

  create: (data: FaultCreateRequest) =>
    axiosInstance.post<Fault>('/faults', data).then((r) => r.data),

  // TODO: used by fault edit page (not yet implemented)
  update: (id: number, data: FaultUpdateRequest) =>
    axiosInstance.patch<Fault>(`/faults/${id}`, data).then((r) => r.data),

  changeStatus: (id: number, data: FaultStatusChangeRequest) =>
    axiosInstance.patch<Fault>(`/faults/${id}/status`, data).then((r) => r.data),

  // TODO: used by fault assign feature (not yet implemented)
  assign: (id: number, data: FaultAssignRequest) =>
    axiosInstance.patch<Fault>(`/faults/${id}/assign`, data).then((r) => r.data),

  delete: (id: number) =>
    axiosInstance.delete(`/faults/${id}`),
}
