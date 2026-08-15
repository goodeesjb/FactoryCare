import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import { equipmentApi } from '../../api/equipment'
import { FAULT_SEVERITY_LABELS, type FaultSeverity } from '../../types/fault'

export default function FaultCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    equipmentId: '',
    title: '',
    description: '',
    severity: 'MEDIUM' as FaultSeverity,
  })
  const [error, setError] = useState<string | null>(null)

  const { data: equipmentPage } = useQuery({
    queryKey: ['equipments', { size: 100 }],
    queryFn: () => equipmentApi.search({ size: 100 }),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      faultApi.create({
        equipmentId: Number(form.equipmentId),
        title: form.title,
        description: form.description || undefined,
        severity: form.severity,
      }),
    onSuccess: (res) => navigate(`/faults/${res.id}`),
    onError: () => setError('장애 등록에 실패했습니다.'),
  })

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">장애 등록</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutate()
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">설비 *</label>
          <select
            required
            value={form.equipmentId}
            onChange={(e) => setForm((f) => ({ ...f, equipmentId: e.target.value }))}
            className="w-full border rounded px-3 py-2"
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
          <label className="block text-sm font-medium mb-1">제목 *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="장애 제목"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            rows={4}
            placeholder="장애 상세 설명"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">긴급도</label>
          <select
            value={form.severity}
            onChange={(e) =>
              setForm((f) => ({ ...f, severity: e.target.value as FaultSeverity }))
            }
            className="w-full border rounded px-3 py-2"
          >
            {(Object.keys(FAULT_SEVERITY_LABELS) as FaultSeverity[]).map((s) => (
              <option key={s} value={s}>
                {FAULT_SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
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
            onClick={() => navigate('/faults')}
            className="flex-1 border py-2 rounded hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
