import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { faultApi } from '../../api/fault'
import {
  FAULT_STATUS_LABELS,
  NEXT_STATUS_MAP,
  type Fault,
  type FaultStatus,
} from '../../types/fault'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card'

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>상태 변경</CardTitle>
          <p className="text-sm text-muted-foreground">
            현재 상태:{' '}
            <strong className="text-foreground">{FAULT_STATUS_LABELS[fault.status]}</strong>
          </p>
        </CardHeader>
        <CardContent>
          {nextStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">더 이상 변경 가능한 상태가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">변경할 상태</label>
                <div className="flex gap-2 flex-wrap">
                  {nextStatuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedStatus(s)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedStatus === s
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      {FAULT_STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">사유</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[80px] resize-none py-2"
                  placeholder="상태 변경 사유 (선택)"
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-3">
          {nextStatuses.length > 0 && (
            <Button onClick={() => mutate()} disabled={isPending} className="flex-1">
              {isPending ? '변경 중...' : '변경'}
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1">
            닫기
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
