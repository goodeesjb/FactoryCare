import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { maintenanceApi } from '../../api/maintenance'
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_COLORS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus,
  type MaintenancePriority,
} from '../../types/maintenance'

export default function MaintenanceListPage() {
  const [status, setStatus] = useState<MaintenanceStatus | ''>('')
  const [priority, setPriority] = useState<MaintenancePriority | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', { status, priority, page }],
    queryFn: () =>
      maintenanceApi.search({
        status: status || undefined,
        priority: priority || undefined,
        page,
      }),
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">유지보수 관리</h1>
        <Link
          to="/maintenance/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          작업 등록
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as MaintenanceStatus | ''); setPage(0) }}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 상태</option>
          {(Object.keys(MAINTENANCE_STATUS_LABELS) as MaintenanceStatus[]).map(s => (
            <option key={s} value={s}>{MAINTENANCE_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => { setPriority(e.target.value as MaintenancePriority | ''); setPage(0) }}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 우선순위</option>
          {(Object.keys(MAINTENANCE_PRIORITY_LABELS) as MaintenancePriority[]).map(p => (
            <option key={p} value={p}>{MAINTENANCE_PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-200 p-3 text-left">작업번호</th>
                <th className="border border-gray-200 p-3 text-left">제목</th>
                <th className="border border-gray-200 p-3 text-left">설비</th>
                <th className="border border-gray-200 p-3 text-left">유형</th>
                <th className="border border-gray-200 p-3 text-left">우선순위</th>
                <th className="border border-gray-200 p-3 text-left">상태</th>
                <th className="border border-gray-200 p-3 text-left">담당자</th>
                <th className="border border-gray-200 p-3 text-left">예정일</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map(task => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-3 font-mono text-sm">{task.taskNo}</td>
                  <td className="border border-gray-200 p-3">
                    <Link to={`/maintenance/${task.id}`} className="text-blue-600 hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="border border-gray-200 p-3">{task.equipmentName}</td>
                  <td className="border border-gray-200 p-3">{MAINTENANCE_TYPE_LABELS[task.taskType]}</td>
                  <td className="border border-gray-200 p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${MAINTENANCE_PRIORITY_COLORS[task.priority]}`}>
                      {MAINTENANCE_PRIORITY_LABELS[task.priority]}
                    </span>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${MAINTENANCE_STATUS_COLORS[task.status]}`}>
                      {MAINTENANCE_STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="border border-gray-200 p-3">{task.assigneeName ?? '-'}</td>
                  <td className="border border-gray-200 p-3">{task.scheduledDate ?? '-'}</td>
                </tr>
              ))}
              {!data?.content.length && (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-gray-500">
                    등록된 유지보수 작업이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >이전</button>
              <span className="px-3 py-1">{page + 1} / {data.totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.totalPages - 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >다음</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
