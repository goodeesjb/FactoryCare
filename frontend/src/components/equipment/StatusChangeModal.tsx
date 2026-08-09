import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentApi } from '../../api/equipment'
import { EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from '../../types/equipment'

const STATUS_OPTIONS: EquipmentStatus[] = [
  'NORMAL', 'INSPECTION_NEEDED', 'BROKEN', 'REPAIRING', 'DISCARDED',
]

interface Props {
  equipmentId: number
  currentStatus: EquipmentStatus
  onClose: () => void
}

export default function StatusChangeModal({ equipmentId, currentStatus, onClose }: Props) {
  const queryClient = useQueryClient()
  const [newStatus, setNewStatus] = useState<EquipmentStatus>(currentStatus)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => equipmentApi.changeStatus(equipmentId, { newStatus, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', String(equipmentId)] })
      queryClient.invalidateQueries({ queryKey: ['equipment-histories', equipmentId] })
      onClose()
    },
  })

  const handleSubmit = () => {
    if (!reason.trim()) { setError('변경 사유를 입력해주세요.'); return }
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">상태 변경</h2>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">변경할 상태</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as EquipmentStatus)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">변경 사유 *</label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError('') }}
            rows={3}
            placeholder="상태 변경 사유를 입력하세요."
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {mutation.isPending ? '처리 중...' : '변경'}
          </button>
        </div>
      </div>
    </div>
  )
}
