import axiosInstance from './axiosInstance'

export interface KpiResponse {
  totalEquipments: number
  normalEquipments: number
  brokenEquipments: number
  pendingMaintenance: number
  unresolvedFaults: number
  scheduledInspections: number
}

export interface FaultTrendItem {
  month: string
  count: number
}

export interface EquipmentStatusItem {
  status: string
  label: string
  count: number
}

export interface DashboardFaultItem {
  id: number
  title: string
  equipmentName: string
  severity: string
  status: string
  reportedAt: string
}

export interface DashboardMaintenanceItem {
  id: number
  title: string
  taskNo: string
  equipmentName: string
  status: string
  scheduledDate: string | null
}

export interface DashboardSummaryResponse {
  kpi: KpiResponse
  faultTrend: FaultTrendItem[]
  equipmentStatusDistribution: EquipmentStatusItem[]
  recentFaults: DashboardFaultItem[]
  recentMaintenance: DashboardMaintenanceItem[]
}

export const dashboardApi = {
  getSummary: (period: number, equipmentStatus: string) =>
    axiosInstance
      .get<DashboardSummaryResponse>('/dashboard/summary', {
        params: { period, equipmentStatus },
      })
      .then((r) => r.data),
}
