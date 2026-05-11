'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ScrollText, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableError,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from '@/components/ui/table';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

// One audit entry mirrors the backend's handler.AuditLogEntry projection.
interface AuditEntry {
  id: number;
  occurred_at: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  outcome: 'success' | 'failure';
  response_status?: number;
  ip?: string;
  user_agent?: string;
  user_id?: number;
  user_email?: string;
  user_full_name?: string;
  request_summary?: Record<string, unknown>;
}

interface AuditListResponse {
  success: boolean;
  data: {
    items: AuditEntry[];
    total: number;
    limit: number;
    offset: number;
  };
}

const PAGE_SIZE = 50;

function AuditPage() {
  const { currentOrg, currentOrgRole } = useAuth();
  const [page, setPage] = useState(0);

  const isAdmin = currentOrgRole === 'admin';

  const auditQuery = useQuery<AuditListResponse>({
    queryKey: ['audit', currentOrg?.id, page],
    queryFn: async () => {
      const res = await api.audit.list({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      return res.data;
    },
    enabled: isAdmin && Boolean(currentOrg?.id),
  });

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <header>
            <h1 className="text-2xl font-semibold text-fg">Audit Log</h1>
          </header>
          <Alert variant="warning">
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>Admin access required</AlertTitle>
            <AlertDescription>
              The audit log is restricted to organization administrators. Ask an admin to grant you
              the role if you need visibility.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const items = auditQuery.data?.data.items ?? [];
  const total = auditQuery.data?.data.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-fg">
              <ScrollText className="h-6 w-6 text-fg-muted" aria-hidden="true" />
              Audit Log
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Every change in {currentOrg?.name ?? 'this organization'}, ordered by recency. Read
              traffic is intentionally omitted to keep the trail focused on actions that change
              state.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Showing{' '}
              {items.length > 0
                ? `${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + items.length}`
                : '0'}
              {' of '}
              {total.toLocaleString()} entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead align="center">Outcome</TableHead>
                  <TableHead align="right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.isLoading ? (
                  <TableLoading message="Loading audit log…" rowSpan={6} />
                ) : auditQuery.isError ? (
                  <TableError
                    message="Failed to load the audit log. Refresh the page to try again."
                    rowSpan={6}
                  />
                ) : items.length === 0 ? (
                  <TableEmpty
                    message="No audit entries yet. Mutating actions (uploads, alert rules, deletes) will appear here."
                    rowSpan={6}
                  />
                ) : (
                  items.map((entry) => (
                    <TableRow
                      key={entry.id}
                      intent={entry.outcome === 'failure' ? 'danger' : undefined}
                    >
                      <TableCell mono>{formatWhen(entry.occurred_at)}</TableCell>
                      <TableCell>{whoLabel(entry)}</TableCell>
                      <TableCell mono>{entry.action}</TableCell>
                      <TableCell>{resourceLabel(entry)}</TableCell>
                      <TableCell align="center">
                        <Badge variant={entry.outcome === 'success' ? 'success' : 'danger'}>
                          {entry.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell align="right" mono>
                        {entry.response_status ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination — only show when there's more than one page of data. */}
        {total > PAGE_SIZE && (
          <nav
            aria-label="Audit pagination"
            className="flex items-center justify-between text-sm text-fg-muted"
          >
            <span>
              Page {page + 1} of {totalPages.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev || auditQuery.isFetching}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext || auditQuery.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        )}
      </div>
    </DashboardLayout>
  );
}

// formatWhen renders the ISO timestamp in a stable local-time form. Browser
// locale-driven for the date portion, fixed 24h for the time portion so the
// table stays scannable.
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 19);
  return `${date} ${time}`;
}

// whoLabel prefers full name, falls back to email, then the raw user id,
// then '—' when the actor is null (system-initiated mutations once we add
// them).
function whoLabel(entry: AuditEntry): string {
  if (entry.user_full_name) return entry.user_full_name;
  if (entry.user_email) return entry.user_email;
  if (entry.user_id) return `User #${entry.user_id}`;
  return '—';
}

// resourceLabel renders "resource_type[#id]" so the table is scannable
// even for the resource_type-only rows (creates).
function resourceLabel(entry: AuditEntry): string {
  if (entry.resource_id) return `${entry.resource_type} #${entry.resource_id}`;
  return entry.resource_type;
}

export default AuditPage;
