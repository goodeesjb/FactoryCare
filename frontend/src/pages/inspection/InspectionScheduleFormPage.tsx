import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { inspectionChecklistApi, inspectionScheduleApi } from '../../api/inspection'
import { equipmentApi } from '../../api/equipment'
import { SCHEDULE_TYPE_LABELS, type InspectionScheduleType } from '../../types/inspection'

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

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">점검 일정 등록</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">설비 *</label>
          <select
            required
            value={form.equipmentId}
            onChange={set('equipmentId')}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">설비 선택</option>
            {equipments?.content.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name} ({eq.equipmentNo})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">체크리스트 *</label>
          <select
            required
            value={form.checklistId}
            onChange={set('checklistId')}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">체크리스트 선택</option>
            {checklists?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">담당자 ID *</label>
          <input
            required
            type="number"
            min={1}
            value={form.assigneeId}
            onChange={set('assigneeId')}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="사용자 ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">예정일 *</label>
          <input
            required
            type="date"
            value={form.scheduledDate}
            onChange={set('scheduledDate')}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">점검 유형</label>
          <select
            value={form.inspectionType}
            onChange={set('inspectionType')}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {SCHEDULE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="점검 메모 (선택)"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? '저장 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
