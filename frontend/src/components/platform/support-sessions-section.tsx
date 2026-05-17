'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

// SupportSessionsSection is the audited "vendor admin looked at
// customer data" flow. Open a session against a target customer org
// with a written justification; auto-expires after 1h. The session
// itself does NOT grant additional read access — platform admins
// already see every org — what it records is the intent + reason +
// timestamp for the audit trail that the customer can pull later.

interface CustomerOption {
  id: number;
  name: string;
  slug: string;
}

interface SupportSession {
  id: number;
  vendor_user_id: number;
  vendor_email: string;
  target_organization_id: number;
  target_organization_name: string;
  target_organization_slug: string;
  justification: string;
  started_at: string;
  expires_at: string;
  ended_at?: string;
  active: boolean;
}

export function SupportSessionsSection() {
  const [includeEnded, setIncludeEnded] = useState(false);

  return (
    <section className="space-y-4">
      <header>
        <h3 className="text-sm font-semibold">Support mode</h3>
        <p className="text-xs text-muted-foreground">
          Open an explicit, time-bounded session before viewing a customer&apos;s data. The customer
          can pull the audit log later via their account page — no silent impersonation.
        </p>
      </header>

      <OpenSessionForm />

      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sessions
        </h4>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={includeEnded}
            onChange={(e) => setIncludeEnded(e.target.checked)}
          />
          Include ended / expired
        </label>
      </div>
      <SessionsTable includeEnded={includeEnded} />
    </section>
  );
}

function OpenSessionForm() {
  const qc = useQueryClient();
  const [slug, setSlug] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pull the same customers list the Customers tab uses so the
  // dropdown is the source of truth (no manual slug typos).
  const customersQuery = useQuery({
    queryKey: ['platform', 'organizations'],
    queryFn: async () => (await api.platform.organizations.list()).data.data as CustomerOption[],
  });
  const customers = useMemo(
    () => (customersQuery.data ?? []).filter((c) => c.slug !== 'default'),
    [customersQuery.data]
  );

  const mutation = useMutation({
    mutationFn: () =>
      api.platform.support.create({
        target_organization_slug: slug,
        justification: justification.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'support-sessions'] });
      setError(null);
      setSlug('');
      setJustification('');
    },
    onError: (err: unknown) => setError(extractApiError(err) ?? 'Failed to open session.'),
  });

  const canSubmit = slug.trim().length > 0 && justification.trim().length >= 5;

  return (
    <form
      className="rounded-lg border border-border bg-surface p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="support-target">
            Target customer
          </label>
          <select
            id="support-target"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            required
          >
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="support-just">
            Justification (≥ 5 chars)
          </label>
          <Input
            id="support-just"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Reported missing ingestion runs in ticket #1234"
            required
            minLength={5}
          />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={!canSubmit || mutation.isPending} className="gap-2">
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Open support session
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t open session</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}

function SessionsTable({ includeEnded }: { includeEnded: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['platform', 'support-sessions', { includeEnded }],
    queryFn: async () =>
      (await api.platform.support.list({ includeEnded })).data.data as SupportSession[],
    refetchInterval: 30_000,
  });
  const endMutation = useMutation({
    mutationFn: (id: number) => api.platform.support.end(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'support-sessions'] }),
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Target</TableHead>
          <TableHead>Opened by</TableHead>
          <TableHead>Justification</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Status</TableHead>
          <TableHead aria-label="Actions" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {query.isLoading && <TableLoading message="Loading sessions…" rowSpan={7} />}
        {query.isError && <TableError message="Failed to load sessions." rowSpan={7} />}
        {query.isSuccess && query.data.length === 0 && (
          <TableEmpty
            message={
              includeEnded
                ? 'No support sessions on record.'
                : 'No active sessions. Open one with the form above.'
            }
            rowSpan={7}
          />
        )}
        {query.isSuccess &&
          query.data.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                {s.target_organization_name}
                <div className="text-xs text-muted-foreground font-mono">
                  {s.target_organization_slug}
                </div>
              </TableCell>
              <TableCell className="text-xs">{s.vendor_email}</TableCell>
              <TableCell className="text-xs max-w-sm">{s.justification}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(s.started_at).toLocaleString()}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(s.expires_at).toLocaleString()}
              </TableCell>
              <TableCell>
                {s.active ? (
                  <Badge variant="default">active</Badge>
                ) : s.ended_at ? (
                  <Badge variant="outline">ended</Badge>
                ) : (
                  <Badge variant="secondary">expired</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {s.active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => endMutation.mutate(s.id)}
                    disabled={endMutation.isPending}
                  >
                    <ShieldOff className="h-4 w-4" />
                    End
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

interface ApiErrorShape {
  response?: { data?: { error?: { message?: string } } };
  message?: string;
}

function extractApiError(err: unknown): string | null {
  if (!err) return null;
  const e = err as ApiErrorShape;
  return e?.response?.data?.error?.message ?? e?.message ?? null;
}
