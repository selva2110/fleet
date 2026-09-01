'use client'

import { useState } from 'react'
import { CalendarDays, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTranslation } from '../context/language-provider';

export function RowActions({
  onEdit,
  onDelete,
  onPto,
  deleteTitle,
  deleteMessage,
  canDelete = true,
  deleteDisabledReason,
}: {
  onEdit: () => void
  onDelete: () => void | Promise<void>
  onPto?: () => void
  deleteTitle: string
  deleteMessage: string
  /** When false, the Delete action is disabled (e.g. dispatched events). */
  canDelete?: boolean
  /** Shown in place of the Delete label when deletion is not allowed. */
  deleteDisabledReason?: string
}) {
  const {t} = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    setDeleting(true)
    try {
      await onDelete()
      setConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t('common.rowactions')}>
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-3.5" /> {t('common.edit')}
          </DropdownMenuItem>
          {onPto ? (
            <DropdownMenuItem onClick={onPto}>
              <CalendarDays className="size-3.5" /> {t('driver.ptorequests')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete}
            onClick={() => {
              if (canDelete) setConfirmOpen(true)
            }}
          >
            <Trash2 className="size-3.5" />
            {canDelete ? t('common.delete') : deleteDisabledReason ?? t('common.deleteunavailable')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{deleteTitle}</DialogTitle>
            <DialogDescription>{deleteMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
