import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { CalendarPlus, ArrowLeft } from 'lucide-react'
import { inspectionChecklistApi, inspectionScheduleApi } from '../../api/inspection'
import { equipmentApi } from '../../api/equipment'
import { SCHEDULE_TYPE_LABELS, type InspectionScheduleType } from '../../types/inspection'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'

const TYPE_OPTIONS: InspectionScheduleType[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']

export default function InspectionScheduleFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    equipmentId: '',
    checklistId: '',
    assigneeId: '',
    scheduledDate: '',
    inspectionType: 'CUSTOM' as InspectionScheduleType,
    description: '',
  })

  const { data: equipments } = useQuery({
    queryKey: ['equipments-all'],
    queryFn: () => equipmentApi.search({ size: 100 }),
  })

  const { data: checklists } = useQuery({
    queryKey: ['inspection-checklists'],
    queryFn: inspectionChecklistApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: inspectionScheduleApi.create,
    onSuccess: () => navigate('/inspection-schedules'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      equipmentId: Number(form.equipmentId),
      checklistId: Number(form.checklistId),
      assigneeId: Number(form.assigneeId),
      scheduledDate: form.scheduledDate,
      inspectionType: form.inspectionType,
      description: form.description || undefined,
    })
  }

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const inputClass =
    'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CalendarPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">점검 일정 등록</h1>
            <p className="text-sm text-muted-foreground">새 점검 일정을 등록합니다</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>일정 정보</CardTitle>
          <CardDescription>* 표시된 항목은 필수 입력입니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">설비 *</label>
                <select
                  required
                  value={form.equipmentId}
                  onChange={set('equipmentId')}
                  className={inputClass}
                >
                  <option value="">설비 선택</option>
                  {equipments?.content.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.equipmentNo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">체크리스트 *</label>
                <select
                  required
                  value={form.checklistId}
                  onChange={set('checklistId')}
                  className={inputClass}
                >
                  <option value="">체크리스트 선택</option>
                  {checklists?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">담당자 ID *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.assigneeId}
                  onChange={set('assigneeId')}
                  className={inputClass}
                  placeholder="사용자 ID"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">예정일 *</label>
                <input
                  required
                  type="date"
                  value={form.scheduledDate}
                  onChange={set('scheduledDate')}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium">점검 유형</label>
                <select
                  value={form.inspectionType}
                  onChange={set('inspectionType')}
                  className={inputClass}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {SCHEDULE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">메모</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                placeholder="점검 메모 (선택)"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? '저장 중...' : '저장'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                취소
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
