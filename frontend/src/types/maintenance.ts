import type { SpringPage } from './equipment'

export type { SpringPage }

export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type MaintenanceType = 'REPAIR' | 'PREVENTIVE' | 'INSPECTION_FOLLOWUP' | 'OTHER'
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type MaintenanceHistoryType = 'START' | 'COMPLETE'

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소',
}

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  CRITICAL: '긴급',
}

export const MAINTENANCE_PRIORITY_COLORS: Record<MaintenancePriority, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  REPAIR: '수리',
  PREVENTIVE: '예방정비',
  INSPECTION_FOLLOWUP: '점검후속',
  OTHER: '기타',
}

export interface MaintenanceHistory {
  id: number
  type: MaintenanceHistoryType
  recordedByName: string
  content: string
  durationMinutes: number | null
  recordedAt: string
}

export interface MaintenanceTask {
  id: number
  taskNo: string
  equipmentId: number
  equipmentName: string
  faultId: number | null
  title: string
  description: string | null
  taskType: MaintenanceType
  priority: MaintenancePriority
  assigneeId: number | null
  assigneeName: string | null
  scheduledDate: string | null
  status: MaintenanceStatus
  createdByName: string
  completedAt: string | null
  histories: MaintenanceHistory[]
  createdAt: string
}

export interface MaintenanceCreateRequest {
  equipmentId: number
  faultId?: number
  title: string
  description?: string
  taskType: MaintenanceType
  priority?: MaintenancePriority
  assigneeId?: number
  scheduledDate?: string
}

export interface MaintenanceUpdateRequest {
  title?: string
  description?: string
  taskType?: MaintenanceType
  priority?: MaintenancePriority
  scheduledDate?: string
}

export interface MaintenanceAssignRequest {
  assigneeId: number
}

export interface MaintenanceStartRequest {
  content: string
}

export interface MaintenanceCompleteRequest {
  content: string
  durationMinutes?: number
}

export interface MaintenanceSearchParams {
  equipmentId?: number
  status?: MaintenanceStatus
  priority?: MaintenancePriority
  assigneeId?: number
  faultId?: number
  from?: string
  to?: string
  page?: number
  size?: number
}
