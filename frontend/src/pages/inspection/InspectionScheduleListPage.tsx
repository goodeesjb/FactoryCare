import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarCheck, Plus, Play, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { inspectionScheduleApi } from '../../api/inspection'
import {
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_TYPE_LABELS,
  type InspectionScheduleStatus,
} from '../../types/inspection'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

const STATUS_OPTIONS: InspectionScheduleStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']

const STATUS_BADGE_VARIANT: Record<InspectionScheduleStatus, 'info' | 'warning' | 'success' | 'destructive'> = {
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  OVERDUE: 'destructive',
}

export default function InspectionScheduleListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<{ page: number; size: number; status?: InspectionScheduleStatus }>({
    page: 0,
    size: 10,
  })
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inspection-schedules', params],
    queryFn: () => inspectionScheduleApi.search(params),
  })

  const startMutation = useMutation({
    mutationFn: inspectionScheduleApi.start,
    onSuccess: (inspection) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] })
      toast.success('점검이 시작되었습니다.')
      navigate(`/inspections/${inspection.id}`)
    },
    onError: () => toast.error('점검 시작에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: inspectionScheduleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] })
      setDeleteTargetId(null)
      toast.success('점검 일정이 삭제되었습니다.')
    },
    onError: () => {
      setDeleteTargetId(null)
      toast.error('점검 일정 삭제에 실패했습니다.')
    },
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">점검 일정</h1>
            <p className="text-sm text-muted-foreground">설비 점검 일정을 관리합니다</p>
          </div>
        </div>
        <Button onClick={() => navigate('/inspection-schedules/new')}>
          <Plus className="h-4 w-4" />
          점검 일정 등록
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={params.status ?? ''}
          onChange={(e) =>
            setParams((p) => ({ ...p, page: 0, status: (e.target.value as InspectionScheduleStatus) || undefined }))
          }
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        >
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{SCHEDULE_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <span className="text-sm">로딩 중...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['설비', '체크리스트', '담당자', '예정일', '유형', '상태', '작업'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.content.map((s) => (
                    <tr key={s.id} className={`hover:bg-muted/30 transition-colors${s.status === 'OVERDUE' ? ' bg-destructive/5' : ''}`}>
                      <td className="px-4 py-3 font-medium">{s.equipmentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.checklistName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.assigneeName}</td>
                      <td className={`px-4 py-3 font-mono text-xs${s.status === 'OVERDUE' ? ' text-destructive font-semibold' : ''}`}>
                        {s.scheduledDate}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{SCHEDULE_TYPE_LABELS[s.inspectionType]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE_VARIANT[s.status]}>
                          {SCHEDULE_STATUS_LABELS[s.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {s.status === 'SCHEDULED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => startMutation.mutate(s.id)}
                              disabled={startMutation.isPending}
                            >
                              <Play className="h-3 w-3" />
                              점검 시작
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTargetId(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.content.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                        <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">등록된 점검 일정이 없습니다.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data?.first}
            onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {(data?.number ?? 0) + 1} / {data?.totalPages ?? 1} 페이지
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data?.last}
            onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="점검 일정 삭제"
        description="점검 일정을 삭제하시겠습니까?"
        confirmLabel="삭제"
        onConfirm={() => deleteTargetId !== null && deleteMutation.mutate(deleteTargetId)}
        onCancel={() => setDeleteTargetId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
