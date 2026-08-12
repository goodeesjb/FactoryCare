export type InspectionScheduleStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
export type InspectionScheduleType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
export type InspectionStatus = 'IN_PROGRESS' | 'COMPLETED'
export type InspectionResultValue = 'PASS' | 'FAIL' | 'SKIPPED'

export const SCHEDULE_STATUS_LABELS: Record<InspectionScheduleStatus, string> = {
  SCHEDULED: '예정',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  OVERDUE: '기한초과',
}

export const SCHEDULE_STATUS_COLORS: Record<InspectionScheduleStatus, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
}

export const RESULT_COLORS: Record<InspectionResultValue, string> = {
  PASS: 'bg-green-100 text-green-800',
  FAIL: 'bg-red-100 text-red-800',
  SKIPPED: 'bg-gray-100 text-gray-600',
}

export const SCHEDULE_TYPE_LABELS: Record<InspectionScheduleType, string> = {
  DAILY: '일간', WEEKLY: '주간', MONTHLY: '월간', CUSTOM: '수동',
}

export interface InspectionChecklistItem {
  id: number
  itemName: string
  itemOrder: number
}

export interface InspectionChecklist {
  id: number
  name: string
  description: string | null
  equipmentTypeName: string | null
  items: InspectionChecklistItem[]
  createdAt: string
}

export interface InspectionSchedule {
  id: number
  equipmentId: number
  equipmentName: string
  checklistId: number
  checklistName: string
  assigneeId: number
  assigneeName: string
  scheduledDate: string
  inspectionType: InspectionScheduleType
  status: InspectionScheduleStatus
  description: string | null
  createdAt: string
}

export interface InspectionResultItem {
  id: number
  checklistItemId: number
  itemName: string
  result: InspectionResultValue
  note: string | null
  needsFaultReport: boolean
}

export interface Inspection {
  id: number
  scheduleId: number
  inspectorId: number
  inspectorName: string
  status: InspectionStatus
  hasAbnormality: boolean
  completedAt: string | null
  results: InspectionResultItem[]
  createdAt: string
}

export interface InspectionChecklistCreateRequest {
  name: string
  description?: string
  equipmentTypeId?: number
  itemNames: string[]
}

export interface InspectionScheduleCreateRequest {
  equipmentId: number
  checklistId: number
  assigneeId: number
  scheduledDate: string
  inspectionType?: InspectionScheduleType
  description?: string
}

export interface InspectionCompleteRequest {
  results: Array<{
    checklistItemId: number
    result: InspectionResultValue
    note?: string
  }>
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
