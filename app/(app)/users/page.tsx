"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleCheck,
  KeyRound,
  Mail,
  MapPin,
  Plus,
  ShieldCheck,
  Users as UsersIcon,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowActions } from "@/components/crud/row-actions";
import { UserDialog } from "@/components/crud/user-dialog";
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
} from "@/components/data-view/data-view";
import { getRoles, getUsers } from "@/app/actions/data";
import { deleteRole, deleteUser } from "@/app/actions/crud";
import { tableHeaderRow } from "@/components/aurora/aurora-ui";
import { UsersConfig } from "@/lib/user/config";
import { User } from "@/lib/user/types";
import { initials } from "@/lib/utils";
import { useTranslation } from "@/components/context/language-provider";
import { RoleDialog } from "@/components/crud/role-dialog";
import { TabsContent, TabsList, Tabs } from "@/components/ui/tabs";
import { TabsTrigger } from "@/components/ui/tabs";
import { Role } from "@/lib/auth/types";
import type { ComponentType } from "react";

type TabKey = "users" | "roles";

type StatItem = {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "primary";
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const dv = useDataView("name");
  const [users, setUsers] = useState<User[]>([]);
  const [rolesData, setRolesData] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [roles, setRoles] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const refreshUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await getUsers());
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      setRolesData(await getRoles());
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  // Load all three once on mount
  useEffect(() => {
    void refreshUsers();
    void refreshRoles();
  }, [refreshUsers, refreshRoles]);

  const activeCount = users.filter((u) => u.status).length;
  const activeRoleCount = rolesData.filter((u) => u.status).length;
  const inactiveCount = users.length - activeCount;
  const inactiveRoleCount = rolesData.length - activeRoleCount;
  const adminCount = users.filter((u) =>
    u.roles.some((r) => r.name === "ADMIN"),
  ).length;

  const activeFilterCount = (roles.length ? 1 : 0) + (statuses.length ? 1 : 0);

  function resetFilters() {
    setRoles([]);
    setStatuses([]);
  }

  function roleMetaFor(u: User) {
    const roleName = u.roles[0]?.name ?? "";
    return (
      UsersConfig.roleMeta[roleName] ?? {
        label: roleName,
        cls: "bg-muted text-muted-foreground",
      }
    );
  }

  const filteredUsers = useMemo(() => {
    const q = dv.query.trim().toLowerCase();
    const list = users.filter((u) => {
      const matchQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q);
      const matchRole =
        roles.length === 0 || u.roles.some((r) => roles.includes(r.name));
      const matchStatus =
        statuses.length === 0 ||
        statuses.includes(u.status ? "active" : "inactive");
      return matchQuery && matchRole && matchStatus;
    });
    const sortValue = (u: User) =>
      dv.sortKey === "role"
        ? (u.roles[0]?.name ?? "")
        : u[dv.sortKey as keyof User];
    return list.sort((a, b) =>
      compareValues(sortValue(a), sortValue(b), dv.sortDir),
    );
  }, [users, dv.query, dv.sortKey, dv.sortDir, roles, statuses]);

  const filteredRoles = useMemo(() => {
    const q = dv.query.trim().toLowerCase();
    const list = rolesData.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
    return list.sort((a, b) => compareValues(a.name, b.name, dv.sortDir));
  }, [rolesData, dv.query, dv.sortDir]);

  const pgUsers = usePagination(filteredUsers, 20);
  const pgRoles = usePagination(filteredRoles, 20);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openAddRole() {
    setEditingRole(null);
    setRoleDialogOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setDialogOpen(true);
  }

  function openEditRole(r: Role) {
    setEditingRole(r);
    setRoleDialogOpen(true);
  }

  const userStats: StatItem[] = [
    {
      label: t("user.totusers"),
      value: users.length,
      icon: UsersIcon,
    },
    {
      label: t("common.active"),
      value: activeCount,
      icon: CircleCheck,
      tone: "success",
    },
    {
      label: t("common.inactive"),
      value: inactiveCount,
      icon: UsersIcon,
      tone: "default",
    },
    {
      label: t("user.roleAdmin"),
      value: adminCount,
      icon: ShieldCheck,
      tone: "primary",
    },
  ];

  const roleStats: StatItem[] = [
    {
      label: "Total Roles",
      value: rolesData.length,
      icon: ShieldCheck,
    },
    {
      label: t("common.active"),
      value: activeRoleCount,
      icon: CircleCheck,
      tone: "success",
    },
    {
      label: t("common.inactive"),
      value: inactiveRoleCount,
      icon: ShieldCheck,
      tone: "default",
    },
    {
      label: t("user.roleAdmin"),
      value: adminCount,
      icon: ShieldCheck,
      tone: "primary",
    },
  ];

  const stats = activeTab === "users" ? userStats : roleStats;
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={t("user.title")}
        description={t("user.desc")}
        actions={
          <>
            {activeTab === "roles" ? (
              <Button size="sm" onClick={openAddRole}>
                <Plus className="size-4" />
                Add Role
              </Button>
            ) : (
              activeTab === "users" && (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="size-4" /> {t("user.add")}
                </Button>
              )
            )}
          </>
        }
      />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              tone={stat.tone}
            />
          ))}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabKey)}
        >
          <TabsList>
            <TabsTrigger
              value="users"
              className="flex items-center gap-2 py-2 px-3 cursor-pointer"
            >
              <UsersIcon className="size-4" /> Users
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="flex items-center gap-2 py-2 px-3 cursor-pointer"
            >
              <ShieldCheck className="size-4" /> Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <ListLayout
              filters={
                <FilterRail
                  activeCount={activeFilterCount}
                  onReset={resetFilters}
                >
                  <FilterSection title={t("user.role")}>
                    <CheckboxGroupFilter
                      options={UsersConfig.ROLE_OPTIONS}
                      selected={roles}
                      onChange={setRoles}
                    />
                  </FilterSection>
                  <FilterSection title={t("common.status")}>
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
                  searchPlaceholder={t("user.searchplaceholder")}
                  sortOptions={UsersConfig.SORT_OPTIONS}
                  sortKey={dv.sortKey}
                  onSortKeyChange={dv.setSortKey}
                  sortDir={dv.sortDir}
                  onToggleSortDir={dv.toggleSortDir}
                  view={dv.view}
                  onViewChange={dv.setView}
                  resultCount={filteredUsers.length}
                />

                {!loadingUsers && filteredUsers.length === 0 ? (
                  <EmptyState message={t("user.nousersmatch")} />
                ) : dv.view === "grid" ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pgUsers.pageItems.map((u) => {
                      const roleMeta = roleMetaFor(u);
                      console.log(roleMeta)
                      const statusMeta =
                        UsersConfig.statusMeta[
                          u.status ? "active" : "inactive"
                        ];
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
                                <p className="truncate text-sm font-semibold">
                                  {u.name}
                                </p>
                                <div className="flex items-center gap-1">
                                  <StatusBadge
                                    label={t(statusMeta.label)}
                                    cls={statusMeta.cls}
                                  />
                                  <RowActions
                                    variant="menu"
                                    onEdit={() => openEdit(u)}
                                    onDelete={async () => {
                                      await deleteUser(u.id, u.name);
                                      await refreshUsers();
                                    }}
                                    deleteTitle={t("user.delete")}
                                    deleteMessage={t(
                                      "user.deleteconfirm",
                                    ).replace("{{name}}", u.name)}
                                  />
                                </div>
                              </div>
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="size-3" /> {u.email}
                              </p>
                              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <MapPin className="size-3" /> {u.address || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                            <StatusBadge
                              label={t(roleMeta.label)}
                              cls={roleMeta.cls}
                            />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="overflow-hidden py-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tableHeaderRow([
                              t("common.name"),
                              t("auth.email"),
                              t("common.address"),
                              t("user.role"),
                              t("common.status"),
                            ])}
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pgUsers.pageItems.map((u) => {
                            const roleMeta = roleMetaFor(u);
                            const statusMeta =
                              UsersConfig.statusMeta[
                                u.status ? "active" : "inactive"
                              ];
                            return (
                              <TableRow key={u.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="size-8">
                                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                        {initials(u.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm font-medium">
                                      {u.name}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {u.email}
                                </TableCell>
                                <TableCell className="max-w-55 truncate text-sm text-muted-foreground">
                                  {u.address || "—"}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge
                                    label={t(roleMeta.label)}
                                    cls={roleMeta.cls}
                                  />
                                </TableCell>
                                <TableCell>
                                  <StatusBadge
                                    label={t(statusMeta.label)}
                                    cls={statusMeta.cls}
                                  />
                                </TableCell>
                                <TableCell>
                                  <RowActions
                                    onEdit={() => openEdit(u)}
                                    onDelete={async () => {
                                      await deleteUser(u.id, u.name);
                                      await refreshUsers();
                                    }}
                                    deleteTitle={t("user.delete")}
                                    deleteMessage={t(
                                      "user.deleteconfirm",
                                    ).replace("{{name}}", u.name)}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}

                {filteredUsers.length > 0 ? (
                  <Pagination
                    page={pgUsers.page}
                    pageCount={pgUsers.pageCount}
                    pageSize={pgUsers.pageSize}
                    onPageChange={pgUsers.setPage}
                    onPageSizeChange={pgUsers.setPageSize}
                    rangeStart={pgUsers.rangeStart}
                    rangeEnd={pgUsers.rangeEnd}
                    total={pgUsers.total}
                    itemLabel={t("user.title").toLowerCase()}
                  />
                ) : null}
              </div>
            </ListLayout>
          </TabsContent>

          {/* ---------------- ROLES TAB ---------------- */}
          <TabsContent value="roles">
            <div className="flex flex-col gap-6">
              <DataToolbar
                query={dv.query}
                onQueryChange={dv.setQuery}
                searchPlaceholder="Search roles..."
                sortOptions={[{ key: "name", label: "Name" }]}
                sortKey="name"
                onSortKeyChange={dv.setSortKey}
                sortDir={dv.sortDir}
                onToggleSortDir={dv.toggleSortDir}
                view={dv.view}
                onViewChange={dv.setView}
                resultCount={filteredRoles.length}
              />

              {!loadingRoles && filteredRoles.length === 0 ? (
                <EmptyState message="No roles match your search." />
              ) : dv.view === "grid" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pgRoles.pageItems.map((u) => {
                    const statusMeta =
                      UsersConfig.statusMeta[u.status ? "active" : "inactive"];
                    return (
                      <Card key={u.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="size-10">
                            <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary capitalize">
                              {initials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">
                                {u.name}
                              </p>
                              <div className="flex items-center gap-1">
                                <StatusBadge
                                  label={t(statusMeta.label)}
                                  cls={statusMeta.cls}
                                />
                                <RowActions
                                  variant="menu"
                                  onEdit={() => openEditRole(u)}
                                  onDelete={async () => {
                                    await deleteRole(u.id, u.name);
                                    await refreshRoles();
                                  }}
                                  deleteTitle="Delete Row"
                                  deleteMessage={t(
                                    "user.deleteconfirm",
                                  ).replace("{{name}}", u.name)}
                                />
                              </div>
                            </div>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              {u.description || "—"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="overflow-hidden py-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {tableHeaderRow(["Role", "Description", "Status"])}
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pgRoles.pageItems.map((r) => {
                          const statusMeta =
                            UsersConfig.statusMeta[
                              r.status ? "active" : "inactive"
                            ];

                          return (
                            <TableRow key={r.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium capitalize">
                                    {r.name.toLocaleLowerCase()}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-80 truncate text-sm text-muted-foreground">
                                {r.description || "—"}
                              </TableCell>
                              <TableCell>
                                <StatusBadge
                                  label={t(statusMeta.label)}
                                  cls={statusMeta.cls}
                                />
                              </TableCell>
                              <TableCell>
                                <RowActions
                                  onEdit={() => openEditRole(r)}
                                  onDelete={async () => {
                                    await deleteRole(r.id, r.name);
                                    await refreshRoles();
                                  }}
                                  deleteTitle="Delete role"
                                  deleteMessage={`Are you sure you want to delete "${r.name}"?`}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}

              {filteredRoles.length > 0 ? (
                <Pagination
                  page={pgRoles.page}
                  pageCount={pgRoles.pageCount}
                  pageSize={pgRoles.pageSize}
                  onPageChange={pgRoles.setPage}
                  onPageSizeChange={pgRoles.setPageSize}
                  rangeStart={pgRoles.rangeStart}
                  rangeEnd={pgRoles.rangeEnd}
                  total={pgRoles.total}
                  itemLabel="roles"
                />
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={refreshUsers}
      />
      <RoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        onSaved={refreshRoles}
        editing={editingRole}
      />
    </div>
  );
}
