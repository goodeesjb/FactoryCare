import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { maintenanceApi } from '../../api/maintenance'
import { equipmentApi } from '../../api/equipment'
import { faultApi } from '../../api/fault'
import {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_PRIORITY_LABELS,
  type MaintenanceType,
  type MaintenancePriority,
} from '../../types/maintenance'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'

export default function MaintenanceCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const faultId = searchParams.get('faultId') ? Number(searchParams.get('faultId')) : undefined

  const [form, setForm] = useState({
    equipmentId: '',
    title: '',
    description: '',
    taskType: 'REPAIR' as MaintenanceType,
    priority: 'MEDIUM' as MaintenancePriority,
    scheduledDate: '',
  })
  const [error, setError] = useState<string | null>(null)

  const { data: equipmentPage } = useQuery({
    queryKey: ['equipments', 'all'],
    queryFn: () => equipmentApi.search({ size: 100 }),
  })

  const { data: fault } = useQuery({
    queryKey: ['fault', faultId],
    queryFn: () => faultApi.getById(faultId!),
    enabled: !!faultId,
  })

  useEffect(() => {
    if (fault) {
      setForm((f) => ({ ...f, equipmentId: String(fault.equipmentId), taskType: 'REPAIR' }))
    }
  }, [fault])

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      maintenanceApi.create({
        equipmentId: Number(form.equipmentId),
        faultId,
        title: form.title,
        description: form.description || undefined,
        taskType: form.taskType,
        priority: form.priority,
        scheduledDate: form.scheduledDate || undefined,
      }),
    onSuccess: (res) => navigate(`/maintenance/${res.id}`),
    onError: () => setError('작업 등록에 실패했습니다.'),
  })

  const inputCls =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">유지보수 작업 등록</h1>
        <p className="text-muted-foreground text-sm mt-1">새 유지보수 작업을 등록합니다.</p>
      </div>

      {/* Fault 연동 배너 */}
      {faultId && fault && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="font-medium">장애 연동:</span>{' '}
          <strong>{fault.title}</strong>
          <span className="text-blue-600 ml-1">({fault.equipmentName})</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>작업 정보 입력</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutate()
            }}
            className="flex flex-col gap-5"
          >
            <div>
              <label className="block text-sm font-medium mb-1.5">
                설비 <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={form.equipmentId}
                onChange={(e) => setForm((f) => ({ ...f, equipmentId: e.target.value }))}
                disabled={!!faultId}
                className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <option value="">설비 선택</option>
                {equipmentPage?.content.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.equipmentNo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                제목 <span className="text-destructive">*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={inputCls}
                placeholder="작업 제목을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                작업 유형 <span className="text-destructive">*</span>
              </label>
              <select
                value={form.taskType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, taskType: e.target.value as MaintenanceType }))
                }
                className={inputCls}
              >
                {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]).map((t) => (
                  <option key={t} value={t}>
                    {MAINTENANCE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">우선순위</label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as MaintenancePriority }))
                }
                className={inputCls}
              >
                {(Object.keys(MAINTENANCE_PRIORITY_LABELS) as MaintenancePriority[]).map((p) => (
                  <option key={p} value={p}>
                    {MAINTENANCE_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">설명</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[80px] resize-none py-2"
                placeholder="작업 내용 설명 (선택)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">예정일</label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? '등록 중...' : '등록'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(faultId ? `/faults/${faultId}` : '/maintenance')}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
