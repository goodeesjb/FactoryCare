import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { partApi } from '../../api/parts'
import { STOCK_STATUS_LABELS, type StockStatus } from '../../types/parts'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

const stockVariant: Record<StockStatus, 'success' | 'orange' | 'destructive'> = {
  NORMAL: 'success',
  LOW: 'orange',
  OUT: 'destructive',
}

export default function PartListPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [storageLocation, setStorageLocation] = useState('')
  const [stockStatus, setStockStatus] = useState<StockStatus | ''>('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['parts', { keyword, storageLocation, stockStatus, page }],
    queryFn: () =>
      partApi.search({
        keyword: keyword || undefined,
        storageLocation: storageLocation || undefined,
        stockStatus: stockStatus || undefined,
        page,
      }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">부품 관리</h1>
        <Button onClick={() => navigate('/parts/new')}>부품 등록</Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="부품명 / 제조사"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <input
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="보관위치"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
            <select
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value as StockStatus | '')
                setPage(0)
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">전체 재고상태</option>
              <option value="NORMAL">정상</option>
              <option value="LOW">부족</option>
              <option value="OUT">소진</option>
            </select>
            <Button type="submit" variant="outline">검색</Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">로딩 중...</p>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">부품번호</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">부품명</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">제조사</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">재고</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">최소재고</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">재고상태</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">보관위치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.content.map((part) => (
                    <tr key={part.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {part.partNo}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/parts/${part.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {part.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{part.manufacturer ?? '-'}</td>
                      <td className="px-4 py-3 font-medium">{part.stockQuantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{part.minimumStock}</td>
                      <td className="px-4 py-3">
                        <Badge variant={stockVariant[part.stockStatus]}>
                          {STOCK_STATUS_LABELS[part.stockStatus]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{part.storageLocation ?? '-'}</td>
                    </tr>
                  ))}
                  {!data?.content.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        등록된 부품이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {data && data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                이전
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                {page + 1} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages - 1}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
