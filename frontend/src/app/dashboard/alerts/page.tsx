'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertOctagon,
  Bell,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableLoading,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { RequirePermission, usePermission } from '@/components/auth/require-permission';
import { Actions } from '@/lib/permissions';
import { api, type CreateAlertRuleRequest } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';

// Shape of an active alert as returned by GET /alerts. Mirrors
// model.Alert in the backend.
interface AlertItem {
  id: number;
  classification_id: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  title: string;
  message: string;
  anomaly_percentage: number;
  threshold_exceeded: boolean;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by?: number;
  acknowledged_at?: string | null;
  resolved_by?: number;
  resolved_at?: string | null;
  created_at: string;
}

interface AlertRuleItem {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  alert_type: string;
  anomaly_threshold: number;
  severity_mapping?: Record<string, unknown>;
  notification_config?: Record<string, unknown>;
  created_by: number;
  created_at: string;
}

const ALERT_TYPES = [
  { value: 'anomaly', label: 'Anomaly detection' },
  { value: 'threshold', label: 'Threshold exceeded' },
];

export default function AlertsPage() {
  return (
    <DashboardLayout>
      <AlertsView />
    </DashboardLayout>
  );
}

function AlertsView() {
  const { currentOrg } = useAuth();
  const queryClient = useQueryClient();

  // Permission gates mirror backend's RequireAction:
  //   alert.rule.create / update -> operator + admin
  //   alert.rule.delete           -> admin only
  //   alert.acknowledge / resolve -> operator + admin
  const canCreate = usePermission(Actions.AlertRuleCreate);
  const canUpdate = usePermission(Actions.AlertRuleUpdate);
  const canAck = usePermission(Actions.AlertAck);
  const canResolve = usePermission(Actions.AlertResolve);

  const alertsQuery = useQuery<AlertItem[]>({
    queryKey: ['alerts', currentOrg?.id],
    queryFn: async () => {
      const res = await api.alerts.list();
      return (res?.data?.data ?? []) as AlertItem[];
    },
    enabled: Boolean(currentOrg?.id),
    refetchInterval: 30_000,
  });

  const rulesQuery = useQuery<AlertRuleItem[]>({
    queryKey: ['alert-rules', currentOrg?.id],
    queryFn: async () => {
      const res = await api.alerts.listRules();
      return (res?.data?.data ?? []) as AlertRuleItem[];
    },
    enabled: Boolean(currentOrg?.id),
  });

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Bell className="h-6 w-6" />
            Alerts
          </CardTitle>
          <CardDescription>
            Active alerts fired against this organization, and the rules that drive them. Anyone in
            the org can read; mutations are role-gated.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <AlertOctagon className="h-4 w-4" />
            Active alerts
            {alertsQuery.data && alertsQuery.data.length > 0 && (
              <Badge variant="secondary">{alertsQuery.data.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <ActiveAlertsTable
            alerts={alertsQuery.data ?? []}
            isLoading={alertsQuery.isLoading}
            canAck={canAck}
            canResolve={canResolve}
            onChanged={() => {
              queryClient.invalidateQueries({ queryKey: ['alerts'] });
            }}
          />
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <RulesPanel
            rules={rulesQuery.data ?? []}
            isLoading={rulesQuery.isLoading}
            canCreate={canCreate}
            canUpdate={canUpdate}
            onChanged={() => {
              queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Active alerts ----------

interface ActiveAlertsTableProps {
  alerts: AlertItem[];
  isLoading: boolean;
  canAck: boolean;
  canResolve: boolean;
  onChanged: () => void;
}

function ActiveAlertsTable({
  alerts,
  isLoading,
  canAck,
  canResolve,
  onChanged,
}: ActiveAlertsTableProps) {
  const [resolveTarget, setResolveTarget] = useState<AlertItem | null>(null);
  const [resolveMessage, setResolveMessage] = useState('');

  const ackMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message?: string }) =>
      api.alerts.acknowledge(id, message),
    onSuccess: onChanged,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      api.alerts.resolve(id, message),
    onSuccess: () => {
      setResolveTarget(null);
      setResolveMessage('');
      onChanged();
    },
  });

  // Show active first, then acknowledged, then resolved. Inside each
  // bucket, newest first.
  const sorted = useMemo(() => {
    const order: Record<string, number> = { active: 0, acknowledged: 1, resolved: 2 };
    return [...alerts].sort((a, b) => {
      const da = order[a.status] ?? 99;
      const db = order[b.status] ?? 99;
      if (da !== db) return da - db;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [alerts]);

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableLoading message="Loading alerts" />
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableEmpty message="No active alerts in this organization." />
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fired</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <SeverityBadge severity={alert.severity} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-fg">{alert.title}</div>
                    <div className="text-xs text-fg-muted">{alert.message}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={alert.status} />
                  </TableCell>
                  <TableCell className="text-sm text-fg-muted">
                    {new Date(alert.created_at).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {alert.status === 'active' && canAck && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ackMutation.isPending}
                          onClick={() => ackMutation.mutate({ id: alert.id })}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {alert.status !== 'resolved' && canResolve && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setResolveTarget(alert);
                            setResolveMessage('');
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resolve dialog. We force a non-empty message because the */}
      {/* backend requires it (binding:"required") and because     */}
      {/* "resolved without a note" is hostile in an audit log.    */}
      <AlertDialog
        open={resolveTarget !== null}
        onOpenChange={(open) => !open && setResolveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve alert</AlertDialogTitle>
            <AlertDialogDescription>
              {resolveTarget?.title}. Add a short note about what was done — it&apos;s recorded in
              the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resolve-message">Resolution note</Label>
            <Input
              id="resolve-message"
              placeholder="e.g. Fan bearing replaced; vibration returned to baseline."
              value={resolveMessage}
              onChange={(e) => setResolveMessage(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!resolveMessage.trim() || resolveMutation.isPending}
              onClick={() =>
                resolveTarget &&
                resolveMutation.mutate({
                  id: resolveTarget.id,
                  message: resolveMessage.trim(),
                })
              }
            >
              {resolveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving
                </>
              ) : (
                'Resolve alert'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === 'critical' || severity === 'high'
      ? 'destructive'
      : severity === 'medium'
        ? 'default'
        : 'secondary';
  return <Badge variant={variant as 'destructive' | 'default' | 'secondary'}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'resolved') return <Badge variant="outline">Resolved</Badge>;
  if (status === 'acknowledged') return <Badge variant="secondary">Acknowledged</Badge>;
  return <Badge variant="default">Active</Badge>;
}

// ---------- Rules panel ----------

interface RulesPanelProps {
  rules: AlertRuleItem[];
  isLoading: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  onChanged: () => void;
}

function RulesPanel({ rules, isLoading, canCreate, canUpdate, onChanged }: RulesPanelProps) {
  const [editing, setEditing] = useState<AlertRuleItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlertRuleItem | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.alerts.deleteRule(id),
    onSuccess: () => {
      setDeleteTarget(null);
      onChanged();
    },
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Alert rules</CardTitle>
          <CardDescription>
            Rules drive alert generation. Any operator or admin in the org can create or edit; only
            admins can delete.
          </CardDescription>
        </div>
        {canCreate && (
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New rule
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <Table>
            <TableBody>
              <TableLoading message="Loading rules" />
            </TableBody>
          </Table>
        ) : rules.length === 0 ? (
          <Table>
            <TableBody>
              <TableEmpty
                message={
                  canCreate
                    ? 'No rules yet. Click "New rule" to create your first one.'
                    : 'No alert rules configured for this organization.'
                }
              />
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg">{rule.name}</span>
                      {!rule.is_active && <Badge variant="outline">Disabled</Badge>}
                    </div>
                    {rule.description && (
                      <div className="text-xs text-fg-muted">{rule.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-fg-muted">{rule.alert_type}</TableCell>
                  <TableCell className="text-sm text-fg-muted">{rule.anomaly_threshold}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(rule)}
                          aria-label={`Edit ${rule.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <RequirePermission perm={Actions.AlertRuleDelete}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(rule)}
                          aria-label={`Delete ${rule.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </RequirePermission>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {(creating || editing) && (
        <RuleEditor
          rule={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            onChanged();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmationDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete alert rule?"
          description={
            <>
              The rule <strong>{deleteTarget.name}</strong> will be removed permanently. Active
              alerts already fired by this rule are not affected.
            </>
          }
          confirmText="Delete rule"
          variant="destructive"
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        />
      )}
    </Card>
  );
}

// ---------- Rule editor ----------

interface RuleEditorProps {
  rule: AlertRuleItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function RuleEditor({ rule, onClose, onSaved }: RuleEditorProps) {
  const isEdit = rule !== null;
  const [name, setName] = useState(rule?.name ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [alertType, setAlertType] = useState(rule?.alert_type ?? 'anomaly');
  const [threshold, setThreshold] = useState(rule?.anomaly_threshold ?? 10);
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateAlertRuleRequest) =>
      isEdit
        ? api.alerts.updateRule(rule.id, { ...data, is_active: isActive })
        : api.alerts.createRule(data),
    onSuccess: () => onSaved(),
    onError: (e: any) => {
      setError(e?.response?.data?.message || 'Failed to save rule. Check the inputs and retry.');
    },
  });

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (threshold < 0.5 || threshold > 50) {
      setError('Threshold must be between 0.5 and 50.');
      return;
    }
    mutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      alert_type: alertType,
      anomaly_threshold: threshold,
    });
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isEdit ? 'Edit alert rule' : 'New alert rule'}</AlertDialogTitle>
          <AlertDialogDescription>
            Rules fire alerts when a stored anomaly classification crosses the threshold. Severity
            mapping + notification config use the backend defaults; tune those via the API for now.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="danger">
            <AlertOctagon className="h-4 w-4" />
            <AlertTitle>Cannot save</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High anomaly on Line 3 baseline"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-description">Description (optional)</Label>
            <Input
              id="rule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this rule catches and who should care"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-type">Type</Label>
              <select
                id="rule-type"
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="w-full rounded-md border border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              >
                {ALERT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-threshold">Threshold (anomaly %)</Label>
              <Input
                id="rule-threshold"
                type="number"
                step="0.5"
                min={0.5}
                max={50}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <input
                id="rule-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-strong text-accent focus:ring-focus"
              />
              <Label htmlFor="rule-active" className="cursor-pointer">
                Rule is active
              </Label>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : isEdit ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save changes
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create rule
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
