'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailPlus, ShieldAlert, Trash2, UserMinus } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { usePermission } from '@/components/auth/require-permission';
import { Actions } from '@/lib/permissions';
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

// MembersSection is the Pattern B onboarding surface inside Account &
// Security. Reads are open to every org member (so a viewer can see
// who their teammates are); writes (invite / role change / remove) are
// gated on admin capabilities via <RequirePermission>.

type OrgRole = 'admin' | 'operator' | 'viewer';

interface MembershipRow {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  role: OrgRole;
  joined_at: string;
  is_last_admin: boolean;
}

interface InvitationRow {
  id: number;
  email: string;
  organization_id: number;
  role: OrgRole;
  invited_by: number;
  invited_by_name?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
};

const ROLE_OPTIONS: OrgRole[] = ['admin', 'operator', 'viewer'];

export function MembersSection() {
  const { user } = useAuth();
  const canInvite = usePermission(Actions.OrgInvite);
  const canChangeRole = usePermission(Actions.OrgRoleChange);
  const canRemove = usePermission(Actions.OrgMemberRemove);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Members</h2>
        <p className="text-sm text-muted-foreground">
          Everyone who can access this organization. Admins can invite new members, change roles,
          and remove people who shouldn&apos;t have access anymore. Registration on this deployment
          is invite-only — there is no public sign-up.
        </p>
      </header>

      {canInvite && <InviteForm />}

      <MembersTable currentUserId={user?.id} canChangeRole={canChangeRole} canRemove={canRemove} />

      {canInvite && <PendingInvitationsTable />}
    </div>
  );
}

// ---------- Invite form ----------

function InviteForm() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('operator');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.invitations.create({ email: email.trim(), role }),
    onSuccess: () => {
      setSuccess(`Invitation sent to ${email}.`);
      setError(null);
      setEmail('');
      qc.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (err: unknown) => {
      setSuccess(null);
      setError(extractApiError(err) ?? 'Failed to send invitation.');
    },
  });

  return (
    <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <h3 className="text-sm font-semibold">Invite a member</h3>
      <p className="text-xs text-muted-foreground">
        The invitee receives an email with a link that lets them register and join this organization
        at the role you pick. The invitation expires in 7 days.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return;
          mutation.mutate();
        }}
      >
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium mb-1" htmlFor="invite-email">
            Email
          </label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="invite-role">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={mutation.isPending || !email.trim()} className="gap-2">
          <MailPlus className="h-4 w-4" />
          {mutation.isPending ? 'Sending…' : 'Send invite'}
        </Button>
      </form>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t send invitation</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertTitle>Invitation sent</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}

// ---------- Members table ----------

function MembersTable({
  currentUserId,
  canChangeRole,
  canRemove,
}: {
  currentUserId?: number;
  canChangeRole: boolean;
  canRemove: boolean;
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['memberships'],
    queryFn: async () => (await api.memberships.list()).data.data as MembershipRow[],
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: OrgRole }) =>
      api.memberships.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
    onError: (err) => setErrorMsg(extractApiError(err) ?? 'Failed to change role.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.memberships.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
    onError: (err) => setErrorMsg(extractApiError(err) ?? 'Failed to remove member.'),
  });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Current members</h3>
      {errorMsg && (
        <Alert variant="destructive">
          <AlertTitle>Action blocked</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {(canChangeRole || canRemove) && <TableHead aria-label="Actions" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isLoading && <TableLoading message="Loading members…" rowSpan={5} />}
          {query.isError && (
            <TableError
              message="Failed to load members. Refresh the page to try again."
              rowSpan={5}
            />
          )}
          {query.isSuccess && query.data.length === 0 && (
            <TableEmpty message="No members yet." rowSpan={5} />
          )}
          {query.isSuccess &&
            query.data.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.full_name || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                <TableCell>
                  {canChangeRole ? (
                    <select
                      value={m.role}
                      disabled={
                        roleMutation.isPending || (m.is_last_admin && m.role === 'admin') // can't demote last admin
                      }
                      onChange={(e) =>
                        roleMutation.mutate({ id: m.id, role: e.target.value as OrgRole })
                      }
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                      title={
                        m.is_last_admin && m.role === 'admin'
                          ? 'Promote another member to admin before changing this role.'
                          : undefined
                      }
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="outline">{ROLE_LABELS[m.role]}</Badge>
                  )}
                  {m.is_last_admin && (
                    <Badge variant="outline" className="ml-2 gap-1">
                      <ShieldAlert className="h-3 w-3" /> last admin
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(m.joined_at)}
                </TableCell>
                {(canChangeRole || canRemove) && (
                  <TableCell className="text-right">
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        disabled={
                          removeMutation.isPending || (m.is_last_admin && m.role === 'admin')
                        }
                        title={
                          m.is_last_admin && m.role === 'admin'
                            ? 'Promote another member to admin before removing this one.'
                            : m.user_id === currentUserId
                              ? 'Leave this organization. You can be re-invited later.'
                              : undefined
                        }
                        onClick={() => {
                          const label =
                            m.user_id === currentUserId
                              ? `Leave ${m.email}? You'll lose access to this org until invited back.`
                              : `Remove ${m.email}? They'll lose access immediately.`;
                          if (window.confirm(label)) removeMutation.mutate(m.id);
                        }}
                      >
                        <UserMinus className="h-4 w-4" />
                        {m.user_id === currentUserId ? 'Leave' : 'Remove'}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </section>
  );
}

// ---------- Pending invitations ----------

function PendingInvitationsTable() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => (await api.invitations.list('pending')).data.data as InvitationRow[],
  });
  const revokeMutation = useMutation({
    mutationFn: (id: number) => api.invitations.revoke(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Pending invitations</h3>
      <p className="text-xs text-muted-foreground">
        Invitations that have been sent but not yet redeemed. Revoke an invite if it went to the
        wrong address or if the person no longer needs access.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Invited by</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead aria-label="Actions" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isLoading && <TableLoading message="Loading invitations…" rowSpan={5} />}
          {query.isError && (
            <TableError
              message="Failed to load invitations. Refresh the page to try again."
              rowSpan={5}
            />
          )}
          {query.isSuccess && query.data.length === 0 && (
            <TableEmpty message="No pending invitations." rowSpan={5} />
          )}
          {query.isSuccess &&
            query.data.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{ROLE_LABELS[inv.role]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {inv.invited_by_name || `#${inv.invited_by}`}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(inv.expires_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    disabled={revokeMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Revoke invitation for ${inv.email}?`))
                        revokeMutation.mutate(inv.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </section>
  );
}

// ---------- Helpers ----------

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

interface ApiErrorShape {
  response?: {
    data?: {
      error?: { message?: string; code?: string };
    };
  };
  message?: string;
}

function extractApiError(err: unknown): string | null {
  if (!err) return null;
  const e = err as ApiErrorShape;
  const msg = e?.response?.data?.error?.message;
  if (msg) return msg;
  return e?.message ?? null;
}
