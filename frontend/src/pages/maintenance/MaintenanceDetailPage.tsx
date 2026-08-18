import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceApi } from '../../api/maintenance'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_COLORS,
  MAINTENANCE_TYPE_LABELS,
} from '../../types/maintenance'

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showStartModal, setShowStartModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [startContent, setStartContent] = useState('')
  const [completeContent, setCompleteContent] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceApi.getById(Number(id)),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['maintenance', id] })

  const startMutation = useMutation({
    mutationFn: () => maintenanceApi.start(Number(id), { content: startContent }),
    onSuccess: () => { setShowStartModal(false); setStartContent(''); invalidate() },
  })

  const completeMutation = useMutation({
    mutationFn: () =>
      maintenanceApi.complete(Number(id), {
        content: completeContent,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      }),
    onSuccess: () => { setShowCompleteModal(false); setCompleteContent(''); setDurationMinutes(''); invalidate() },
  })

  const cancelMutation = useMutation({
    mutationFn: () => maintenanceApi.cancel(Number(id)),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: () => maintenanceApi.delete(Number(id)),
    onSuccess: () => navigate('/maintenance'),
  })

  if (isLoading) return <p className="p-6">로딩 중...</p>
  if (!task) return <p className="p-6">작업을 찾을 수 없습니다.</p>

  const isPending = task.status === 'PENDING'
  const isInProgress = task.status === 'IN_PROGRESS'
  const isDone = task.status === 'COMPLETED' || task.status === 'CANCELLED'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-sm text-gray-500 font-mono mb-1">{task.taskNo}</p>
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{task.equipmentName}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isPending && (
            <button
              onClick={() => setShowStartModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >작업 시작</button>
          )}
          {isInProgress && (
            <button
              onClick={() => setShowCompleteModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >작업 완료</button>
          )}
          {!isDone && (
            <button
              onClick={() => { if (confirm('취소하시겠습니까?')) cancelMutation.mutate() }}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >취소</button>
          )}
          {isPending && (
            <button
              onClick={() => { if (confirm('삭제하시겠습니까?')) deleteMutation.mutate() }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >삭제</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded">
        <div>
          <span className="text-sm text-gray-500">상태</span>
          <p>
            <span className={`px-2 py-1 rounded text-xs font-medium ${MAINTENANCE_STATUS_COLORS[task.status]}`}>
              {MAINTENANCE_STATUS_LABELS[task.status]}
            </span>
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">우선순위</span>
          <p>
            <span className={`px-2 py-1 rounded text-xs font-medium ${MAINTENANCE_PRIORITY_COLORS[task.priority]}`}>
              {MAINTENANCE_PRIORITY_LABELS[task.priority]}
            </span>
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">작업 유형</span>
          <p className="font-medium">{MAINTENANCE_TYPE_LABELS[task.taskType]}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">담당자</span>
          <p className="font-medium">{task.assigneeName ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">예정일</span>
          <p>{task.scheduledDate ?? '-'}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">등록자</span>
          <p>{task.createdByName}</p>
        </div>
        {task.faultId && (
          <div className="col-span-2">
            <span className="text-sm text-gray-500">연관 장애</span>
            <p>
              <Link to={`/faults/${task.faultId}`} className="text-blue-600 hover:underline">
                장애 #{task.faultId} 보기
              </Link>
            </p>
          </div>
        )}
        {task.completedAt && (
          <div>
            <span className="text-sm text-gray-500">완료일시</span>
            <p>{new Date(task.completedAt).toLocaleString('ko-KR')}</p>
          </div>
        )}
      </div>

      {task.description && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">설명</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">작업 이력</h2>
        {task.histories.length === 0 ? (
          <p className="text-gray-500">이력이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {task.histories.map(h => (
              <li
                key={h.id}
                className={`border-l-4 pl-4 py-2 ${h.type === 'START' ? 'border-blue-400' : 'border-green-400'}`}
              >
                <div className="flex items-center gap-2 text-sm mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.type === 'START' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {h.type === 'START' ? '시작' : '완료'}
                  </span>
                  <span className="text-gray-500">by {h.recordedByName}</span>
                  {h.durationMinutes && (
                    <span className="text-gray-500">· {h.durationMinutes}분 소요</span>
                  )}
                  <span className="text-gray-400 ml-auto">
                    {new Date(h.recordedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{h.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">작업 시작</h2>
            <textarea
              value={startContent}
              onChange={e => setStartContent(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              rows={4}
              placeholder="작업 시작 내용을 입력하세요 *"
            />
            <div className="flex gap-3">
              <button
                onClick={() => startMutation.mutate()}
                disabled={!startContent.trim() || startMutation.isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >시작</button>
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 border py-2 rounded hover:bg-gray-50"
              >취소</button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">작업 완료</h2>
            <textarea
              value={completeContent}
              onChange={e => setCompleteContent(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3"
              rows={4}
              placeholder="작업 결과 및 소견을 입력하세요 *"
            />
            <input
              type="number"
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="소요 시간 (분, 선택)"
              min={1}
            />
            <div className="flex gap-3">
              <button
                onClick={() => completeMutation.mutate()}
                disabled={!completeContent.trim() || completeMutation.isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >완료</button>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 border py-2 rounded hover:bg-gray-50"
              >취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
