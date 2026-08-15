import type { SpringPage } from './equipment'

export type { SpringPage }

export type FaultSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type FaultStatus = 'REPORTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export const FAULT_SEVERITY_LABELS: Record<FaultSeverity, string> = {
  LOW: '낮음',
  MEDIUM: '중간',
  HIGH: '높음',
  CRITICAL: '심각',
}

export const FAULT_SEVERITY_COLORS: Record<FaultSeverity, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export const FAULT_STATUS_LABELS: Record<FaultStatus, string> = {
  REPORTED: '접수',
  CONFIRMED: '확인',
  IN_PROGRESS: '작업중',
  RESOLVED: '해결',
  CLOSED: '완료',
}

export const FAULT_STATUS_COLORS: Record<FaultStatus, string> = {
  REPORTED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
}

export const NEXT_STATUS_MAP: Partial<Record<FaultStatus, FaultStatus[]>> = {
  REPORTED: ['CONFIRMED'],
  CONFIRMED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
}

export interface FaultStatusHistory {
  id: number
  fromStatus: FaultStatus
  toStatus: FaultStatus
  changedByName: string
  reason: string | null
  changedAt: string
}

export interface Fault {
  id: number
  equipmentId: number
  equipmentName: string
  title: string
  description: string | null
  severity: FaultSeverity
  status: FaultStatus
  reportedById: number
  reportedByName: string
  assignedToId: number | null
  assignedToName: string | null
  inspectionResultId: number | null
  resolvedAt: string | null
  statusHistories: FaultStatusHistory[]
  createdAt: string
}

export interface FaultCreateRequest {
  equipmentId: number
  title: string
  description?: string
  severity?: FaultSeverity
}

export interface FaultUpdateRequest {
  title?: string
  description?: string
  severity?: FaultSeverity
}

export interface FaultStatusChangeRequest {
  status: FaultStatus
  reason?: string
}

export interface FaultAssignRequest {
  assigneeId: number
}

export interface FaultSearchParams {
  equipmentId?: number
  status?: FaultStatus
  severity?: FaultSeverity
  assigneeId?: number
  from?: string
  to?: string
  page?: number
  size?: number
}
