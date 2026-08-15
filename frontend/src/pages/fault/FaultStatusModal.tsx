import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import {
  FAULT_STATUS_LABELS,
  NEXT_STATUS_MAP,
  type Fault,
  type FaultStatus,
} from '../../types/fault'

interface Props {
  fault: Fault
  onClose: () => void
  onSuccess: () => void
}

export default function FaultStatusModal({ fault, onClose, onSuccess }: Props) {
  const nextStatuses = NEXT_STATUS_MAP[fault.status] ?? []
  const [selectedStatus, setSelectedStatus] = useState<FaultStatus>(
    nextStatuses[0] ?? fault.status,
  )
  const [reason, setReason] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      faultApi.changeStatus(fault.id, {
        status: selectedStatus,
        reason: reason || undefined,
      }),
    onSuccess,
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">상태 변경</h2>
        <p className="text-sm text-gray-500 mb-4">
          현재 상태: <strong>{FAULT_STATUS_LABELS[fault.status]}</strong>
        </p>

        {nextStatuses.length === 0 ? (
          <p className="text-gray-500 mb-4">더 이상 변경 가능한 상태가 없습니다.</p>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">변경할 상태</label>
              <div className="flex gap-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedStatus(s)}
                    className={`px-3 py-2 rounded border ${
                      selectedStatus === s
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-gray-300'
                    }`}
                  >
                    {FAULT_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">사유</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="상태 변경 사유 (선택)"
              />
            </div>
          </>
        )}

        <div className="flex gap-3">
          {nextStatuses.length > 0 && (
            <button
              onClick={() => mutate()}
              disabled={isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '변경 중...' : '변경'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 border py-2 rounded hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
