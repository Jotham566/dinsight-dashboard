'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, CheckCircle2, Loader2, Play, Plus, ShieldCheck } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { RequirePermission, usePermission } from '@/components/auth/require-permission';
import { Actions } from '@/lib/permissions';
import { api, type CreateValidationRuleRequest } from '@/lib/api-client';

// ValidationRulesPanel is a small inline section the catalog drawer
// embeds. It shows the org's validation rules with a button to run any
// subset against the currently-displayed dataset. Create/run are
// operator+admin via the policy matrix.

interface ValidationRule {
  id: number;
  name: string;
  description?: string;
  rule_type: string;
  field_name?: string;
  is_active: boolean;
  severity: string;
  created_at: string;
}

const RULE_TYPES = [
  { value: 'range', label: 'Range' },
  { value: 'format', label: 'Format' },
  { value: 'completeness', label: 'Completeness' },
  { value: 'uniqueness', label: 'Uniqueness' },
  { value: 'custom', label: 'Custom' },
];

const SEVERITIES = [
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

export interface ValidationRulesPanelProps {
  /** Dataset the "Run validation" button targets. */
  datasetId: number;
}

export function ValidationRulesPanel({ datasetId }: ValidationRulesPanelProps) {
  const queryClient = useQueryClient();
  const canCreate = usePermission(Actions.ValidationRuleCreate);
  const canRun = usePermission(Actions.ValidationRun);

  const [creating, setCreating] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<number>>(new Set());
  const [runError, setRunError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const rulesQuery = useQuery<ValidationRule[]>({
    queryKey: ['validation-rules'],
    queryFn: async () => {
      const res = await api.validation.listRules();
      return (res?.data?.data?.rules ?? res?.data?.data ?? []) as ValidationRule[];
    },
  });

  const runMutation = useMutation({
    mutationFn: (ruleIds: number[]) =>
      api.validation.run({
        dataset_id: datasetId,
        validation_rule_ids: ruleIds.length > 0 ? ruleIds : undefined,
      }),
    onSuccess: () => {
      setRunMessage(
        selectedRuleIds.size > 0
          ? `Ran ${selectedRuleIds.size} rule(s) against dataset #${datasetId}.`
          : `Ran all active rules against dataset #${datasetId}.`
      );
      setRunError(null);
      setSelectedRuleIds(new Set());
      // Validation-results panel above this lives in the same drawer;
      // invalidate so it refetches.
      queryClient.invalidateQueries({ queryKey: ['dataset', datasetId, 'validation'] });
    },
    onError: (e: any) => {
      setRunError(e?.response?.data?.message || 'Failed to run validation.');
      setRunMessage(null);
    },
  });

  const activeRules = (rulesQuery.data ?? []).filter((r) => r.is_active);

  const toggleSelect = (id: number) => {
    setSelectedRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-fg-muted">Validation rules</p>
        <div className="flex items-center gap-2">
          {canRun && activeRules.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate(Array.from(selectedRuleIds))}
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {selectedRuleIds.size > 0
                    ? `Run ${selectedRuleIds.size} selected`
                    : 'Run all active'}
                </>
              )}
            </Button>
          )}
          {canCreate && (
            <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New rule
            </Button>
          )}
        </div>
      </div>

      {runError && (
        <Alert variant="danger">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>Validation failed</AlertTitle>
          <AlertDescription>{runError}</AlertDescription>
        </Alert>
      )}
      {runMessage && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Validation triggered</AlertTitle>
          <AlertDescription>{runMessage} See results above.</AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {canRun && <TableHead className="w-8">{/* checkbox column */}</TableHead>}
            <TableHead>Rule</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rulesQuery.isLoading ? (
            <TableLoading message="Loading rules" />
          ) : (rulesQuery.data ?? []).length === 0 ? (
            <TableEmpty
              message={
                canCreate
                  ? 'No validation rules yet. Create one to start checking datasets.'
                  : 'No validation rules configured for this organization.'
              }
            />
          ) : (
            (rulesQuery.data ?? []).map((rule) => (
              <TableRow key={rule.id}>
                {canRun && (
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${rule.name}`}
                      disabled={!rule.is_active}
                      checked={selectedRuleIds.has(rule.id)}
                      onChange={() => toggleSelect(rule.id)}
                      className="h-4 w-4 rounded border-strong text-accent focus:ring-focus"
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="font-medium text-fg">{rule.name}</div>
                  {rule.field_name && (
                    <div className="text-xs text-fg-muted">field: {rule.field_name}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-fg-muted">{rule.rule_type}</TableCell>
                <TableCell>
                  <SeverityBadge severity={rule.severity} />
                </TableCell>
                <TableCell>
                  {rule.is_active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {creating && (
        <CreateRuleDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['validation-rules'] });
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') return <Badge variant="destructive">Critical</Badge>;
  if (severity === 'error') return <Badge variant="destructive">Error</Badge>;
  if (severity === 'warning') return <Badge variant="secondary">Warning</Badge>;
  return <Badge variant="outline">{severity}</Badge>;
}

interface CreateRuleDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateRuleDialog({ onClose, onCreated }: CreateRuleDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState('range');
  const [fieldName, setFieldName] = useState('');
  const [severity, setSeverity] = useState('error');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateValidationRuleRequest) => api.validation.createRule(data),
    onSuccess: () => onCreated(),
    onError: (e: any) => {
      setError(e?.response?.data?.message || 'Failed to create rule.');
    },
  });

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    mutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      rule_type: ruleType,
      field_name: fieldName.trim() || undefined,
      severity,
    });
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New validation rule</AlertDialogTitle>
          <AlertDialogDescription>
            Defines a check that can be run against any dataset in this org. Rule parameters (range
            bounds, regex, etc.) use backend defaults for now — tune via API.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="danger">
            <AlertOctagon className="h-4 w-4" />
            <AlertTitle>Cannot create</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Name</Label>
            <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-description">Description</Label>
            <Input
              id="rule-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this rule checks and why"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-type">Type</Label>
              <select
                id="rule-type"
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                className="w-full rounded-md border border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              >
                {RULE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-severity">Severity</Label>
              <select
                id="rule-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-md border border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-field">Field name (optional)</Label>
            <Input
              id="rule-field"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="Leave empty for dataset-level rules"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} onClick={submit}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Create rule
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
