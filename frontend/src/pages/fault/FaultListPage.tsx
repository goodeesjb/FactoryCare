import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { faultApi } from '../../api/fault'
import {
  FAULT_SEVERITY_LABELS,
  FAULT_SEVERITY_COLORS,
  FAULT_STATUS_LABELS,
  FAULT_STATUS_COLORS,
  type FaultSeverity,
  type FaultStatus,
} from '../../types/fault'

export default function FaultListPage() {
  const [status, setStatus] = useState<FaultStatus | ''>('')
  const [severity, setSeverity] = useState<FaultSeverity | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['faults', { status, severity, page }],
    queryFn: () =>
      faultApi.search({
        status: status || undefined,
        severity: severity || undefined,
        page,
      }),
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">장애 관리</h1>
        <Link
          to="/faults/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          장애 등록
        </Link>
      </div>

      <div className="flex gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as FaultStatus | '')
            setPage(0)
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 상태</option>
          {(Object.keys(FAULT_STATUS_LABELS) as FaultStatus[]).map((s) => (
            <option key={s} value={s}>
              {FAULT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value as FaultSeverity | '')
            setPage(0)
          }}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 긴급도</option>
          {(Object.keys(FAULT_SEVERITY_LABELS) as FaultSeverity[]).map((s) => (
            <option key={s} value={s}>
              {FAULT_SEVERITY_LABELS[s]}
            </option>
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
                <th className="border border-gray-200 p-3 text-left">제목</th>
                <th className="border border-gray-200 p-3 text-left">설비</th>
                <th className="border border-gray-200 p-3 text-left">긴급도</th>
                <th className="border border-gray-200 p-3 text-left">상태</th>
                <th className="border border-gray-200 p-3 text-left">등록자</th>
                <th className="border border-gray-200 p-3 text-left">등록일</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((fault) => (
                <tr key={fault.id} className="hover:bg-gray-50">
                  <td className="border border-gray-200 p-3">
                    <Link
                      to={`/faults/${fault.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {fault.title}
                    </Link>
                  </td>
                  <td className="border border-gray-200 p-3">{fault.equipmentName}</td>
                  <td className="border border-gray-200 p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${FAULT_SEVERITY_COLORS[fault.severity]}`}
                    >
                      {FAULT_SEVERITY_LABELS[fault.severity]}
                    </span>
                  </td>
                  <td className="border border-gray-200 p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${FAULT_STATUS_COLORS[fault.status]}`}
                    >
                      {FAULT_STATUS_LABELS[fault.status]}
                    </span>
                  </td>
                  <td className="border border-gray-200 p-3">{fault.reportedByName}</td>
                  <td className="border border-gray-200 p-3">
                    {new Date(fault.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
              {!data?.content.length && (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500">
                    등록된 장애가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                이전
              </button>
              <span className="px-3 py-1">
                {page + 1} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages - 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
