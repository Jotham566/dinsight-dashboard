'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Loader2, PauseCircle, PlayCircle, PlusCircle, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { usePermission } from '@/components/auth/require-permission';
import { Actions } from '@/lib/permissions';
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

// DevicesSection is the customer-side Devices admin surface in
// Account & Security. Lists every device in the active org (open to
// any member — viewer / operator / admin) and gates create / update
// / delete / rotate-API-key on the per-action admin role. The backend
// is the authoritative gate; this file just hides affordances.

type DeviceStatus = 'active' | 'paused' | 'retired';

interface DeviceRow {
  id: number;
  uuid: string;
  organization_id: number;
  name: string;
  slug: string;
  blob_path_prefix: string;
  description?: string;
  status: DeviceStatus;
  api_key_hint: string;
  api_key_created_at: string;
  api_key_revoked_at?: string;
  last_ingested_at?: string;
  last_ingest_error?: string;
  created_at: string;
  updated_at: string;
}

interface DeviceCreateResponse {
  device: DeviceRow;
  api_key: string;
}

interface DeviceRotateResponse {
  device: DeviceRow;
  api_key: string;
}

const STATUS_BADGE: Record<
  DeviceStatus,
  { label: string; variant: 'default' | 'outline' | 'secondary' }
> = {
  active: { label: 'Active', variant: 'default' },
  paused: { label: 'Paused', variant: 'secondary' },
  retired: { label: 'Retired', variant: 'outline' },
};

export function DevicesSection() {
  const canCreate = usePermission(Actions.DeviceCreate);
  const canUpdate = usePermission(Actions.DeviceUpdate);
  const canDelete = usePermission(Actions.DeviceDelete);
  const canRotate = usePermission(Actions.DeviceRotateKey);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold">Devices</h2>
        <p className="text-sm text-muted-foreground">
          Each device represents one physical machine being monitored. The mobile app records sound
          from a device, processes it, and writes CSVs into the device&apos;s blob path. The
          Dinsight backend picks them up and feeds them through the same analysis pipeline the
          manual upload uses.
        </p>
      </header>

      {canCreate && <AddDeviceForm />}

      <DevicesTable canUpdate={canUpdate} canDelete={canDelete} canRotate={canRotate} />
    </div>
  );
}

// ---------- Add device form ----------

function AddDeviceForm() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<DeviceCreateResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.devices.create({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (res) => {
      setCreated(res.data.data as DeviceCreateResponse);
      setError(null);
      setName('');
      setSlug('');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (err: unknown) => {
      setCreated(null);
      setError(extractApiError(err) ?? 'Failed to add device.');
    },
  });

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === slugifyDevice(name)) {
      setSlug(slugifyDevice(v));
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <h3 className="text-sm font-semibold">Add a device</h3>
      <p className="text-xs text-muted-foreground">
        Creating a device mints an <strong>API key</strong> shown ONCE on this page — copy it into
        the mobile app immediately, there&apos;s no recovery. The mobile app uses the API key to
        fetch short-lived SAS tokens for blob uploads, and the device&apos;s slug doubles as its
        blob path prefix.
      </p>
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !slug.trim()) return;
          mutation.mutate();
        }}
      >
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="dev-name">
            Name
          </label>
          <Input
            id="dev-name"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Pump A, Bldg 3"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="dev-slug">
            Slug (blob path prefix)
          </label>
          <Input
            id="dev-slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="pump-a-bldg-3"
            pattern="^[a-z][a-z0-9-]{0,62}$"
            title="Lowercase letters, digits, hyphens. Leading letter, max 63 chars."
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1" htmlFor="dev-desc">
            Description (optional)
          </label>
          <Input
            id="dev-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Centrifugal pump, supply line, 2nd floor"
          />
        </div>
        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={mutation.isPending || !name.trim() || !slug.trim()}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {mutation.isPending ? 'Adding…' : 'Add device'}
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t add device</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {created && (
        <APIKeyReceipt
          apiKey={created.api_key}
          deviceName={created.device.name}
          onDismiss={() => setCreated(null)}
        />
      )}
    </section>
  );
}

// ---------- API key receipt (shown once after create / rotate) ----------

function APIKeyReceipt({
  apiKey,
  deviceName,
  onDismiss,
}: {
  apiKey: string;
  deviceName: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Alert>
      <AlertTitle className="flex items-center gap-2">
        <KeyRound className="h-4 w-4" />
        API key for {deviceName}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <div className="text-sm">
          Copy this key into the mobile app NOW — it will <strong>never</strong> be shown again.
          Storing it server-side would defeat the security model.
        </div>
        <div className="rounded border border-strong bg-surface-muted p-2 text-xs font-mono break-all">
          {apiKey}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              void navigator.clipboard.writeText(apiKey);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy className="h-3 w-3" />
            {copied ? 'Copied!' : 'Copy API key'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss (I&apos;ve copied it)
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// ---------- Devices table ----------

function DevicesTable({
  canUpdate,
  canDelete,
  canRotate,
}: {
  canUpdate: boolean;
  canDelete: boolean;
  canRotate: boolean;
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['devices'],
    queryFn: async () => (await api.devices.list()).data.data as DeviceRow[],
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rotated, setRotated] = useState<DeviceRotateResponse | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status?: DeviceStatus } }) =>
      api.devices.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
    onError: (err) => setErrorMsg(extractApiError(err) ?? 'Failed to update device.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.devices.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
    onError: (err) => setErrorMsg(extractApiError(err) ?? 'Failed to delete device.'),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: number) => api.devices.rotateKey(id),
    onSuccess: (res) => {
      setRotated(res.data.data as DeviceRotateResponse);
      qc.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (err) => setErrorMsg(extractApiError(err) ?? 'Failed to rotate API key.'),
  });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Current devices</h3>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertTitle>Action blocked</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {rotated && (
        <APIKeyReceipt
          apiKey={rotated.api_key}
          deviceName={`${rotated.device.name} (rotated)`}
          onDismiss={() => setRotated(null)}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug / blob path</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>API key</TableHead>
            <TableHead>Last ingested</TableHead>
            {(canUpdate || canDelete || canRotate) && <TableHead aria-label="Actions" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isLoading && <TableLoading message="Loading devices…" rowSpan={6} />}
          {query.isError && <TableError message="Failed to load devices." rowSpan={6} />}
          {query.isSuccess && query.data.length === 0 && (
            <TableEmpty
              message="No devices yet. Add one with the form above to start receiving CSVs from the mobile app."
              rowSpan={6}
            />
          )}
          {query.isSuccess &&
            query.data.map((d) => {
              const statusInfo = STATUS_BADGE[d.status];
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {d.name}
                    {d.description && (
                      <div className="text-xs text-muted-foreground">{d.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {d.slug}
                    <div className="text-[10px]">prefix: {d.blob_path_prefix}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">••••{d.api_key_hint}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.last_ingested_at ? formatDate(d.last_ingested_at) : '—'}
                    {d.last_ingest_error && (
                      <div className="text-danger-text">{d.last_ingest_error}</div>
                    )}
                  </TableCell>
                  {(canUpdate || canDelete || canRotate) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate && d.status === 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({ id: d.id, data: { status: 'paused' } })
                            }
                          >
                            <PauseCircle className="h-4 w-4" /> Pause
                          </Button>
                        )}
                        {canUpdate && d.status === 'paused' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({ id: d.id, data: { status: 'active' } })
                            }
                          >
                            <PlayCircle className="h-4 w-4" /> Resume
                          </Button>
                        )}
                        {canRotate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            disabled={rotateMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Rotate API key for ${d.name}? The mobile app will need to be re-pasted with the new key.`
                                )
                              ) {
                                rotateMutation.mutate(d.id);
                              }
                            }}
                          >
                            <KeyRound className="h-4 w-4" /> Rotate
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-destructive hover:text-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete device ${d.name}? Historical data stays; the device is hidden.`
                                )
                              ) {
                                deleteMutation.mutate(d.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </section>
  );
}

// ---------- helpers ----------

function slugifyDevice(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63);
}

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
