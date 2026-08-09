import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentApi } from '../../api/equipment'
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLORS } from '../../types/equipment'
import StatusChangeModal from '../../components/equipment/StatusChangeModal'

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => equipmentApi.getById(Number(id)),
    enabled: Boolean(id),
  })

  const { data: histories } = useQuery({
    queryKey: ['equipment-histories', id],
    queryFn: () => equipmentApi.getStatusHistories(Number(id)),
    enabled: Boolean(id),
  })

  const deleteMutation = useMutation({
    mutationFn: () => equipmentApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] })
      navigate('/equipments')
    },
  })

  if (isLoading) return <p className="p-6 text-center text-gray-500">로딩 중...</p>
  if (!equipment) return <p className="p-6 text-center text-red-500">설비를 찾을 수 없습니다.</p>

  const fields = [
    { label: '설비번호', value: equipment.equipmentNo },
    { label: '설비유형', value: equipment.type?.name ?? '—' },
    { label: '제조사', value: equipment.manufacturer ?? '—' },
    { label: '모델명', value: equipment.modelName ?? '—' },
    { label: '설치일', value: equipment.installedAt ?? '—' },
    { label: '위치', value: equipment.location ?? '—' },
    { label: '관리부서', value: equipment.department ?? '—' },
    { label: '담당자', value: equipment.assignee?.name ?? '—' },
  ]

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{equipment.name}</h1>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${EQUIPMENT_STATUS_COLORS[equipment.status]}`}>
            {EQUIPMENT_STATUS_LABELS[equipment.status]}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)}
            className="rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50">
            상태변경
          </button>
          <button onClick={() => navigate(`/equipments/${id}/edit`)}
            className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            수정
          </button>
          <button
            onClick={() => { if (confirm('비활성화하시겠습니까?')) deleteMutation.mutate() }}
            className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">
            삭제
          </button>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="mb-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-700">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium text-gray-500">{label}</dt>
              <dd className="mt-0.5 text-sm text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>
        {equipment.description && (
          <div className="mt-3">
            <dt className="text-xs font-medium text-gray-500">설명</dt>
            <dd className="mt-0.5 text-sm text-gray-800">{equipment.description}</dd>
          </div>
        )}
      </div>

      {/* 상태변경 이력 */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-700">상태변경 이력</h2>
        {histories && histories.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {histories.map((h) => (
              <li key={h.id} className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EQUIPMENT_STATUS_COLORS[h.previousStatus]}`}>
                    {EQUIPMENT_STATUS_LABELS[h.previousStatus]}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EQUIPMENT_STATUS_COLORS[h.newStatus]}`}>
                    {EQUIPMENT_STATUS_LABELS[h.newStatus]}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{new Date(h.changedAt).toLocaleString('ko-KR')}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{h.reason}</p>
                <p className="text-xs text-gray-400">변경자: {h.changedByName}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">변경 이력이 없습니다.</p>
        )}
      </div>

      {showModal && (
        <StatusChangeModal
          equipmentId={equipment.id}
          currentStatus={equipment.status}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
