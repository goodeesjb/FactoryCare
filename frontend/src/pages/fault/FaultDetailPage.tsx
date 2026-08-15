import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import {
  FAULT_SEVERITY_LABELS,
  FAULT_SEVERITY_COLORS,
  FAULT_STATUS_LABELS,
  FAULT_STATUS_COLORS,
} from '../../types/fault'
import FaultStatusModal from './FaultStatusModal'

export default function FaultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showStatusModal, setShowStatusModal] = useState(false)

  const { data: fault, isLoading } = useQuery({
    queryKey: ['fault', id],
    queryFn: () => faultApi.getById(Number(id)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => faultApi.delete(Number(id)),
    onSuccess: () => navigate('/faults'),
  })

  if (isLoading) return <p className="p-6">로딩 중...</p>
  if (!fault) return <p className="p-6">장애를 찾을 수 없습니다.</p>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{fault.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{fault.equipmentName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStatusModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            상태변경
          </button>
          <button
            onClick={() => {
              if (confirm('삭제하시겠습니까?')) deleteMutation.mutate()
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded">
        <div>
          <span className="text-sm text-gray-500">상태</span>
          <p>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${FAULT_STATUS_COLORS[fault.status]}`}
            >
              {FAULT_STATUS_LABELS[fault.status]}
            </span>
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">긴급도</span>
          <p>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${FAULT_SEVERITY_COLORS[fault.severity]}`}
            >
              {FAULT_SEVERITY_LABELS[fault.severity]}
            </span>
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">등록자</span>
          <p className="font-medium">{fault.reportedByName}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">담당자</span>
          <p className="font-medium">{fault.assignedToName ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">등록일</span>
          <p>{new Date(fault.createdAt).toLocaleString('ko-KR')}</p>
        </div>
        {fault.resolvedAt && (
          <div>
            <span className="text-sm text-gray-500">해결일</span>
            <p>{new Date(fault.resolvedAt).toLocaleString('ko-KR')}</p>
          </div>
        )}
      </div>

      {fault.description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">설명</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{fault.description}</p>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">상태변경 이력</h2>
        {fault.statusHistories.length === 0 ? (
          <p className="text-gray-500">이력이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {fault.statusHistories.map((h) => (
              <li key={h.id} className="border-l-2 border-blue-400 pl-4 py-1">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${FAULT_STATUS_COLORS[h.fromStatus]}`}
                  >
                    {FAULT_STATUS_LABELS[h.fromStatus]}
                  </span>
                  <span>→</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${FAULT_STATUS_COLORS[h.toStatus]}`}
                  >
                    {FAULT_STATUS_LABELS[h.toStatus]}
                  </span>
                  <span className="text-gray-500">by {h.changedByName}</span>
                  <span className="text-gray-400">
                    {new Date(h.changedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                {h.reason && <p className="text-sm text-gray-600 mt-1">{h.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showStatusModal && (
        <FaultStatusModal
          fault={fault}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            setShowStatusModal(false)
            queryClient.invalidateQueries({ queryKey: ['fault', id] })
          }}
        />
      )}
    </div>
  )
}
