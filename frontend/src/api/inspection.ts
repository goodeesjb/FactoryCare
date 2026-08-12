import axiosInstance from './axiosInstance'
import type {
  InspectionChecklist,
  InspectionChecklistCreateRequest,
  InspectionSchedule,
  InspectionScheduleCreateRequest,
  Inspection,
  InspectionCompleteRequest,
  SpringPage,
  InspectionScheduleStatus,
} from '../types/inspection'

export const inspectionChecklistApi = {
  getAll: () =>
    axiosInstance.get<InspectionChecklist[]>('/inspection-checklists').then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<InspectionChecklist>(`/inspection-checklists/${id}`).then((r) => r.data),

  create: (data: InspectionChecklistCreateRequest) =>
    axiosInstance.post<InspectionChecklist>('/inspection-checklists', data).then((r) => r.data),

  update: (id: number, data: Partial<InspectionChecklistCreateRequest>) =>
    axiosInstance.patch<InspectionChecklist>(`/inspection-checklists/${id}`, data).then((r) => r.data),

  delete: (id: number) => axiosInstance.delete(`/inspection-checklists/${id}`),
}

export const inspectionScheduleApi = {
  search: (params?: {
    equipmentId?: number
    assigneeId?: number
    status?: InspectionScheduleStatus
    from?: string
    to?: string
    page?: number
    size?: number
  }) =>
    axiosInstance.get<SpringPage<InspectionSchedule>>('/inspection-schedules', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<InspectionSchedule>(`/inspection-schedules/${id}`).then((r) => r.data),

  create: (data: InspectionScheduleCreateRequest) =>
    axiosInstance.post<InspectionSchedule>('/inspection-schedules', data).then((r) => r.data),

  update: (id: number, data: Partial<InspectionScheduleCreateRequest>) =>
    axiosInstance.patch<InspectionSchedule>(`/inspection-schedules/${id}`, data).then((r) => r.data),

  delete: (id: number) => axiosInstance.delete(`/inspection-schedules/${id}`),

  start: (id: number) =>
    axiosInstance.post<Inspection>(`/inspection-schedules/${id}/start`).then((r) => r.data),
}

export const inspectionApi = {
  getAll: () =>
    axiosInstance.get<Inspection[]>('/inspections').then((r) => r.data),

  getById: (id: number) =>
    axiosInstance.get<Inspection>(`/inspections/${id}`).then((r) => r.data),

  complete: (id: number, data: InspectionCompleteRequest) =>
    axiosInstance.post<Inspection>(`/inspections/${id}/complete`, data).then((r) => r.data),
}
