export type EquipmentStatus = 'NORMAL' | 'INSPECTION_NEEDED' | 'BROKEN' | 'REPAIRING' | 'DISCARDED'

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  NORMAL: '정상',
  INSPECTION_NEEDED: '점검필요',
  BROKEN: '고장',
  REPAIRING: '수리중',
  DISCARDED: '폐기',
}

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  NORMAL: 'bg-green-100 text-green-800',
  INSPECTION_NEEDED: 'bg-yellow-100 text-yellow-800',
  BROKEN: 'bg-red-100 text-red-800',
  REPAIRING: 'bg-blue-100 text-blue-800',
  DISCARDED: 'bg-gray-100 text-gray-800',
}

export interface EquipmentType {
  id: number
  name: string
  description: string | null
}

export interface Equipment {
  id: number
  equipmentNo: string
  name: string
  type: EquipmentType | null
  manufacturer: string | null
  modelName: string | null
  installedAt: string | null
  location: string | null
  department: string | null
  assignee: { id: number; name: string; loginId: string } | null
  status: EquipmentStatus
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface EquipmentSearchParams {
  equipmentNo?: string
  name?: string
  typeId?: number
  status?: EquipmentStatus
  location?: string
  assigneeId?: number
  page?: number
  size?: number
  sort?: string
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

export interface EquipmentStatusHistory {
  id: number
  previousStatus: EquipmentStatus
  newStatus: EquipmentStatus
  reason: string
  changedByName: string
  changedAt: string
}

export interface EquipmentCreateRequest {
  equipmentNo: string
  name: string
  typeId?: number
  manufacturer?: string
  modelName?: string
  installedAt?: string
  location?: string
  department?: string
  assigneeId?: number
  description?: string
}

export type EquipmentUpdateRequest = Partial<Omit<EquipmentCreateRequest, 'equipmentNo'>>
