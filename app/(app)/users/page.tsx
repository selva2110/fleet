'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleCheck, Mail, MapPin, Plus, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import { PageHeader, StatCard, StatusBadge } from '@/components/common'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RowActions } from '@/components/crud/row-actions'
import { UserDialog } from '@/components/crud/user-dialog'
import {
  CheckboxGroupFilter,
  DataToolbar,
  EmptyState,
  FilterRail,
  FilterSection,
  ListLayout,
  Pagination,
  compareValues,
  useDataView,
  usePagination,
} from '@/components/data-view/data-view'
import { getUsers } from '@/app/actions/data'
import { deleteUser } from '@/app/actions/crud'
import { tableHeaderRow } from '@/components/aurora/aurora-ui'
import { UsersConfig } from '@/lib/user/config'
import { User } from '@/lib/user/types'
import { initials } from '@/lib/utils'
import { useTranslation } from '@/components/context/language-provider'

export default function UsersPage() {
  const { t } = useTranslation()
  const dv = useDataView('name')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const [roles, setRoles] = useState<string[]>([])
  const [statuses, setStatuses] = useState<string[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await getUsers())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const activeCount = users.filter((u) => u.status).length
  const inactiveCount = users.length - activeCount
  const adminCount = users.filter((u) => u.roles.some((r) => r.name === 'ADMIN')).length

  const activeFilterCount = (roles.length ? 1 : 0) + (statuses.length ? 1 : 0)

  function resetFilters() {
    setRoles([])
    setStatuses([])
  }

  function roleMetaFor(u: User) {
    const roleName = u.roles[0]?.name ?? ''
    return UsersConfig.roleMeta[roleName] ?? { label: roleName, cls: 'bg-muted text-muted-foreground' }
  }

  const filtered = useMemo(() => {
    const q = dv.query.trim().toLowerCase()
    const list = users.filter((u) => {
      const matchQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q)
      const matchRole =
        roles.length === 0 || u.roles.some((r) => roles.includes(r.name))
      const matchStatus =
        statuses.length === 0 || statuses.includes(u.status ? 'active' : 'inactive')
      return matchQuery && matchRole && matchStatus
    })
    const sortValue = (u: User) =>
      dv.sortKey === 'role' ? (u.roles[0]?.name ?? '') : u[dv.sortKey as keyof User]
    return list.sort((a, b) => compareValues(sortValue(a), sortValue(b), dv.sortDir))
  }, [users, dv.query, dv.sortKey, dv.sortDir, roles, statuses])

  const pg = usePagination(filtered, 20)

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }
  function openEdit(u: User) {
    setEditing(u)
    setDialogOpen(true)
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t('user.title')}
        description={t('user.desc')}
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" /> {t('user.add')}
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t('user.totusers')} value={users.length} icon={UsersIcon} />
          <StatCard
            label={t('common.active')}
            value={activeCount}
            icon={CircleCheck}
            tone="success"
          />
          <StatCard
            label={t('common.inactive')}
            value={inactiveCount}
            icon={UsersIcon}
            tone="default"
          />
          <StatCard
            label={t('user.roleAdmin')}
            value={adminCount}
            icon={ShieldCheck}
            tone="primary"
          />
        </div>

        <ListLayout
          filters={
            <FilterRail activeCount={activeFilterCount} onReset={resetFilters}>
              <FilterSection title={t('user.role')}>
                <CheckboxGroupFilter
                  options={UsersConfig.ROLE_OPTIONS}
                  selected={roles}
                  onChange={setRoles}
                />
              </FilterSection>
              <FilterSection title={t('common.status')}>
                <CheckboxGroupFilter
                  options={UsersConfig.STATUS_OPTIONS}
                  selected={statuses}
                  onChange={setStatuses}
                />
              </FilterSection>
            </FilterRail>
          }
        >
          <div className="flex flex-col gap-6">
            <DataToolbar
              query={dv.query}
              onQueryChange={dv.setQuery}
              searchPlaceholder={t('user.searchplaceholder')}
              sortOptions={UsersConfig.SORT_OPTIONS}
              sortKey={dv.sortKey}
              onSortKeyChange={dv.setSortKey}
              sortDir={dv.sortDir}
              onToggleSortDir={dv.toggleSortDir}
              view={dv.view}
              onViewChange={dv.setView}
              resultCount={filtered.length}
            />

            {!loading && filtered.length === 0 ? (
              <EmptyState message={t('user.nousersmatch')} />
            ) : dv.view === 'grid' ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pg.pageItems.map((u) => {
                  const roleMeta = roleMetaFor(u)
                  const statusMeta = UsersConfig.statusMeta[u.status ? 'active' : 'inactive']
                  return (
                    <Card key={u.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-10">
                          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{u.name}</p>
                            <div className="flex items-center gap-1">
                              <StatusBadge label={t(statusMeta.label)} cls={statusMeta.cls} />
                              <RowActions
                                onEdit={() => openEdit(u)}
                                onDelete={async () => {
                                  await deleteUser(u.id, u.name)
                                  await refresh()
                                }}
                                deleteTitle={t('user.delete')}
                                deleteMessage={t('user.deleteconfirm').replace('{{name}}', u.name)}
                              />
                            </div>
                          </div>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="size-3" /> {u.email}
                          </p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="size-3" /> {u.address || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <StatusBadge label={t(roleMeta.label)} cls={roleMeta.cls} />
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="overflow-hidden py-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {tableHeaderRow([
                          t('common.name'),
                          t('auth.email'),
                          t('common.address'),
                          t('user.role'),
                          t('common.status'),
                        ])}
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pg.pageItems.map((u) => {
                        const roleMeta = roleMetaFor(u)
                        const statusMeta = UsersConfig.statusMeta[u.status ? 'active' : 'inactive']
                        return (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <Avatar className="size-8">
                                  <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                    {initials(u.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-sm font-medium">{u.name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="max-w-55 truncate text-sm text-muted-foreground">
                              {u.address || '—'}
                            </TableCell>
                            <TableCell>
                              <StatusBadge label={t(roleMeta.label)} cls={roleMeta.cls} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge label={t(statusMeta.label)} cls={statusMeta.cls} />
                            </TableCell>
                            <TableCell>
                              <RowActions
                                onEdit={() => openEdit(u)}
                                onDelete={async () => {
                                  await deleteUser(u.id, u.name)
                                  await refresh()
                                }}
                                deleteTitle={t('user.delete')}
                                deleteMessage={t('user.deleteconfirm').replace('{{name}}', u.name)}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {filtered.length > 0 ? (
              <Pagination
                page={pg.page}
                pageCount={pg.pageCount}
                pageSize={pg.pageSize}
                onPageChange={pg.setPage}
                onPageSizeChange={pg.setPageSize}
                rangeStart={pg.rangeStart}
                rangeEnd={pg.rangeEnd}
                total={pg.total}
                itemLabel={t('user.title').toLowerCase()}
              />
            ) : null}
          </div>
        </ListLayout>
      </div>

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={refresh} />
    </div>
  )
}
