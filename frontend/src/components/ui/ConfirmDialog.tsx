import { Button } from './button'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  title = '확인',
  description,
  confirmLabel = '확인',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mb-6">{description}</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1" disabled={loading}>
            취소
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="flex-1" disabled={loading}>
            {loading ? '처리 중...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
