'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/components/context/language-provider'
import { useNotifications } from '@/components/context/notification-provider'
import { postUserRole } from '@/lib/api/auth'
import { Role } from '@/lib/auth/types'
import { updateRole } from '@/app/actions/crud'
import { Switch } from '../ui/switch'

type RoleForm = {
  name: string
  description: string
  status: boolean
}

const emptyForm: RoleForm = { name: '', description: '',status: true }

export function RoleDialog({
  open,
  onOpenChange,
  onSaved,
  editing
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved?: () => void | Promise<void>
  editing?: Role | null
}) {
  const { t } = useTranslation()
  const { addToast } = useNotifications()
  const [form, setForm] = useState<RoleForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const isEditing = !!editing

  useEffect(() => {
    if (open) {
      setForm(editing ?
        {name:editing.name ?? "", 
          description:editing.description ?? "",
          status: editing.status
        } :
         emptyForm)
    }
  }, [open, editing])

  function setField<K extends keyof RoleForm>(field: K, value: RoleForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const isValid = form.name.trim().length > 0

  async function submit() {
    if (!isValid) return

    setSaving(true)
    try {
      const payload ={
        name: form.name.trim(),
        description: form.description.trim(),
        status: isEditing ? form.status : true
      }

      if (isEditing && editing) {
        await updateRole(editing.id, payload)
      } else {
        await postUserRole(payload)
      }

      addToast({
        title: t('common.success'),
        message: isEditing ? t('role.updatesuccess') : t('role.createsuccess'),
        kind: 'success',
      })
      onOpenChange(false)
      await onSaved?.()
    } catch (error) {
      console.error('Failed to create role:', error)
      addToast({
        title: t('common.savefailed'),
        message: t('common.savefailedmessage'),
        kind: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('role.edit') : t('role.add')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('role.editdesc') : t('role.createdesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">{t('role.name')}</Label>
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={t('role.nameplaceholder')}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-description">{t('role.description')}</Label>
            <Textarea
              id="role-description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder={t('role.descriptionplaceholder')}
              rows={3}
            />
          </div>
          {isEditing ? (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="role-status">{t('common.status')}</Label>
                <p className="text-xs text-muted-foreground">
                  {form.status ? t('common.active') : t('common.inactive')}
                </p>
              </div>
              <Switch
                id="role-status"
                checked={form.status}
                onCheckedChange={(checked) => setField('status', checked)}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={submit} disabled={saving || !isValid}>
            {saving ? t('common.saving') : isEditing ? t('role.savechanges') : t('role.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}