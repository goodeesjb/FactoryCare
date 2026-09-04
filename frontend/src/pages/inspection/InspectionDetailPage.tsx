import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardCheck, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react'
import { inspectionApi, inspectionChecklistApi, inspectionScheduleApi } from '../../api/inspection'
import { type InspectionResultValue } from '../../types/inspection'
import type { InspectionChecklist } from '../../types/inspection'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'

const RESULT_OPTIONS: InspectionResultValue[] = ['PASS', 'FAIL', 'SKIPPED']
const RESULT_LABELS: Record<InspectionResultValue, string> = { PASS: '정상', FAIL: '이상', SKIPPED: '미실시' }

const RESULT_BADGE_VARIANT: Record<InspectionResultValue, 'success' | 'destructive' | 'secondary'> = {
  PASS: 'success',
  FAIL: 'destructive',
  SKIPPED: 'secondary',
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => inspectionApi.getById(Number(id)),
  })

  const [resultMap, setResultMap] = useState<Record<number, { result: InspectionResultValue; note: string }>>({})

  const completeMutation = useMutation({
    mutationFn: (data: Parameters<typeof inspectionApi.complete>[1]) =>
      inspectionApi.complete(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection', id] })
      queryClient.invalidateQueries({ queryKey: ['inspection-schedules'] })
      toast.success('점검이 완료되었습니다.')
    },
    onError: () => toast.error('점검 완료 처리에 실패했습니다.'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground">
        <span className="text-sm">로딩 중...</span>
      </div>
    )
  }
  if (!inspection) {
    return (
      <div className="flex items-center justify-center p-16 text-destructive">
        <span className="text-sm">점검을 찾을 수 없습니다.</span>
      </div>
    )
  }

  const isCompleted = inspection.status === 'COMPLETED'

  const handleComplete = () => {
    const results = Object.entries(resultMap).map(([itemId, v]) => ({
      checklistItemId: Number(itemId),
      result: v.result,
      note: v.note || undefined,
    }))
    if (results.length === 0) {
      toast.error('점검 결과를 입력하세요.')
      return
    }
    completeMutation.mutate({ results })
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">점검 수행</h1>
            <p className="text-sm text-muted-foreground">점검 항목별 결과를 기록합니다</p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">담당자</p>
                <p className="text-sm font-medium">{inspection.inspectorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3" />
                  완료
                </Badge>
              ) : (
                <Badge variant="warning">
                  <Clock className="h-3 w-3" />
                  진행중
                </Badge>
              )}
              {isCompleted && inspection.hasAbnormality && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3" />
                  이상 발견
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results / Form */}
      {isCompleted ? (
        <Card>
          <CardHeader>
            <CardTitle>점검 결과</CardTitle>
            <CardDescription>항목별 점검 결과를 확인합니다</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {inspection.results.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.itemName}</p>
                    {r.note && (
                      <p className="text-xs text-muted-foreground mt-1">{r.note}</p>
                    )}
                    {r.needsFaultReport && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        <span className="text-xs text-destructive font-medium">장애 보고 필요</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={RESULT_BADGE_VARIANT[r.result]}>
                    {RESULT_LABELS[r.result]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <ChecklistForm
          scheduleId={inspection.scheduleId}
          resultMap={resultMap}
          setResultMap={setResultMap}
          onComplete={handleComplete}
          isPending={completeMutation.isPending}
        />
      )}
    </div>
  )
}

function ChecklistForm({
  scheduleId,
  resultMap,
  setResultMap,
  onComplete,
  isPending,
}: {
  scheduleId: number
  resultMap: Record<number, { result: InspectionResultValue; note: string }>
  setResultMap: React.Dispatch<React.SetStateAction<Record<number, { result: InspectionResultValue; note: string }>>>
  onComplete: () => void
  isPending: boolean
}) {
  const { data: scheduleDetail } = useQuery<InspectionChecklist | null>({
    queryKey: ['schedule-checklist', scheduleId],
    queryFn: async () => {
      const schedule = await inspectionScheduleApi.getById(scheduleId)
      const cl = await inspectionChecklistApi.getById(schedule.checklistId)
      return cl
    },
  })

  useEffect(() => {
    if (!scheduleDetail) return
    setResultMap((prev) => {
      const updated = { ...prev }
      scheduleDetail.items.forEach((item) => {
        if (!(item.id in updated)) {
          updated[item.id] = { result: 'PASS', note: '' }
        }
      })
      return updated
    })
  }, [scheduleDetail])

  if (!scheduleDetail) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <span className="text-sm">체크리스트 항목 로딩 중...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>점검 항목 입력</CardTitle>
        <CardDescription>각 항목의 점검 결과를 선택하세요</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {scheduleDetail.items.map((item) => {
            const val = resultMap[item.id] ?? { result: 'PASS' as InspectionResultValue, note: '' }
            return (
              <div key={item.id} className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">
                    <span className="font-mono text-primary/60 mr-1">{item.itemOrder}.</span>
                    {item.itemName}
                  </p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {RESULT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setResultMap((m) => ({ ...m, [item.id]: { ...val, result: opt } }))
                        }
                        className={cn(
                          'rounded-md px-3 py-1 text-xs font-medium border transition-all',
                          val.result === opt
                            ? opt === 'PASS'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : opt === 'FAIL'
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                            : 'border-border text-muted-foreground hover:bg-muted/50'
                        )}
                      >
                        {RESULT_LABELS[opt]}
                      </button>
                    ))}
                  </div>
                </div>
                {val.result === 'FAIL' && (
                  <input
                    value={val.note}
                    onChange={(e) =>
                      setResultMap((m) => ({ ...m, [item.id]: { ...val, note: e.target.value } }))
                    }
                    placeholder="이상 내용 입력"
                    className="h-9 w-full rounded-lg border border-destructive/40 bg-background px-3 text-sm text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive transition-colors"
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="p-6 pt-4 border-t border-border">
          <Button
            onClick={onComplete}
            disabled={isPending || !scheduleDetail}
            className="w-full sm:w-auto"
          >
            <ChecklistCheck className="h-4 w-4" />
            {isPending ? '저장 중...' : '점검 완료'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistCheck({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
