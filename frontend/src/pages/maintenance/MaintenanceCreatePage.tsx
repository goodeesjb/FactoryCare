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
      setForm(f => ({ ...f, equipmentId: String(fault.equipmentId), taskType: 'REPAIR' }))
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
    onSuccess: res => navigate(`/maintenance/${res.id}`),
    onError: () => setError('작업 등록에 실패했습니다.'),
  })

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">유지보수 작업 등록</h1>
      {faultId && fault && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
          장애 연동: <strong>{fault.title}</strong> ({fault.equipmentName})
        </div>
      )}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form
        onSubmit={e => { e.preventDefault(); mutate() }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">설비 *</label>
          <select
            required
            value={form.equipmentId}
            onChange={e => setForm(f => ({ ...f, equipmentId: e.target.value }))}
            disabled={!!faultId}
            className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">설비 선택</option>
            {equipmentPage?.content.map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name} ({eq.equipmentNo})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">제목 *</label>
          <input
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="작업 제목"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">작업 유형 *</label>
          <select
            value={form.taskType}
            onChange={e => setForm(f => ({ ...f, taskType: e.target.value as MaintenanceType }))}
            className="w-full border rounded px-3 py-2"
          >
            {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[]).map(t => (
              <option key={t} value={t}>{MAINTENANCE_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">우선순위</label>
          <select
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value as MaintenancePriority }))}
            className="w-full border rounded px-3 py-2"
          >
            {(Object.keys(MAINTENANCE_PRIORITY_LABELS) as MaintenancePriority[]).map(p => (
              <option key={p} value={p}>{MAINTENANCE_PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="작업 내용 설명"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">예정일</label>
          <input
            type="date"
            value={form.scheduledDate}
            onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? '등록 중...' : '등록'}
          </button>
          <button
            type="button"
            onClick={() => navigate(faultId ? `/faults/${faultId}` : '/maintenance')}
            className="flex-1 border py-2 rounded hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
