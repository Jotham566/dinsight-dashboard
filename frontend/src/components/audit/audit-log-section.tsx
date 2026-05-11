'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { usePermission } from '@/components/auth/require-permission';
import { Actions } from '@/lib/permissions';
import { api } from '@/lib/api-client';
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

// AuditLogSection embeds the audit-log feed inside the Account &
// Security tab. Was previously a standalone /dashboard/audit page; the
// section component lets the content live wherever it makes sense
// without re-shaping the IA every time.

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

const RESOURCE_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All resources' },
  { value: 'alert', label: 'Alerts' },
  { value: 'alert_rule', label: 'Alert rules' },
  { value: 'analysis', label: 'Analyses' },
  { value: 'anomaly_classification', label: 'Anomaly classifications' },
  { value: 'dataset', label: 'Datasets' },
  { value: 'dataset_metadata', label: 'Dataset metadata' },
  { value: 'data_lineage', label: 'Data lineage' },
  { value: 'data_validation_rule', label: 'Validation rules' },
  { value: 'data_validation_result', label: 'Validation results' },
  { value: 'file_upload', label: 'File uploads' },
  { value: 'config', label: 'Configuration' },
];

export function AuditLogSection() {
  const { currentOrg } = useAuth();
  const [page, setPage] = useState(0);
  const [resourceType, setResourceType] = useState('');

  const canRead = usePermission(Actions.AuditRead);

  const auditQuery = useQuery<AuditListResponse>({
    queryKey: ['audit', currentOrg?.id, page, resourceType],
    queryFn: async () => {
      const res = await api.audit.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        resource_type: resourceType || undefined,
      });
      return res.data;
    },
    enabled: canRead && Boolean(currentOrg?.id),
  });

  const handleFilterChange = (value: string) => {
    setResourceType(value);
    setPage(0);
  };

  if (!canRead) {
    return (
      <Alert variant="warning">
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Admin access required</AlertTitle>
        <AlertDescription>
          The audit log is restricted to organization administrators. Ask an admin to grant you the
          role if you need visibility.
        </AlertDescription>
      </Alert>
    );
  }

  const items = auditQuery.data?.data.items ?? [];
  const total = auditQuery.data?.data.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-fg-muted">
          Every change in {currentOrg?.name ?? 'this organization'}, ordered by recency. Showing{' '}
          {items.length > 0 ? `${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + items.length}` : '0'}
          {' of '}
          {total.toLocaleString()} entries
          {resourceType ? ` for ${resourceType}` : ''}.
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="audit-resource-filter" className="text-sm text-fg-muted">
            Resource
          </label>
          <select
            id="audit-resource-filter"
            value={resourceType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-md border border-strong bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          >
            {RESOURCE_TYPE_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border border-border">
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
      </div>

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
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 19);
  return `${date} ${time}`;
}

function whoLabel(entry: AuditEntry): string {
  if (entry.user_full_name) return entry.user_full_name;
  if (entry.user_email) return entry.user_email;
  if (entry.user_id) return `User #${entry.user_id}`;
  return '—';
}

function resourceLabel(entry: AuditEntry): string {
  if (entry.resource_id) return `${entry.resource_type} #${entry.resource_id}`;
  return entry.resource_type;
}
