import type { SpringPage } from './equipment'

export type { SpringPage }

export type StockStatus = 'NORMAL' | 'LOW' | 'OUT'

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  NORMAL: '정상',
  LOW: '부족',
  OUT: '소진',
}

export interface Part {
  id: number
  partNo: string
  name: string
  manufacturer: string | null
  stockQuantity: number
  minimumStock: number
  storageLocation: string | null
  description: string | null
  stockStatus: StockStatus
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface PartUsage {
  id: number
  partId: number
  partName: string
  partNo: string
  maintenanceTaskId: number
  maintenanceTaskNo: string
  quantity: number
  note: string | null
  usedByName: string
  usedAt: string
}

export interface PartCreateRequest {
  name: string
  manufacturer?: string
  stockQuantity: number
  minimumStock?: number
  storageLocation?: string
  description?: string
}

export interface PartUpdateRequest {
  name?: string
  manufacturer?: string
  minimumStock?: number
  storageLocation?: string
  description?: string
}

export interface PartStockAdjustRequest {
  newQuantity: number
}

export interface PartUsageCreateRequest {
  partId: number
  quantity: number
  note?: string
}

export interface PartSearchParams {
  keyword?: string
  storageLocation?: string
  stockStatus?: StockStatus
  page?: number
  size?: number
}
