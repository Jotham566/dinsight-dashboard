'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, KeyRound, Loader2, Shield, User, UserCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api-client';

interface UserSession {
  id: string;
  device?: string;
  browser?: string;
  location?: string;
  ipAddress?: string;
  current?: boolean;
  lastActive?: string;
  createdAt?: string;
}

export default function AccountSecurityPage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [theme, setTheme] = useState('auto');
  const [language, setLanguage] = useState('en');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);

  const {
    data: sessions,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery<UserSession[]>({
    queryKey: ['user-sessions'],
    queryFn: async () => {
      const response = await api.users.getSessions();
      return response?.data?.data?.sessions ?? [];
    },
    retry: false,
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.full_name ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const persistedEmail = window.localStorage.getItem('dinsight:prefs:email_notifications');
    const persistedUpdates = window.localStorage.getItem('dinsight:prefs:system_updates');

    if (persistedEmail != null) {
      setEmailNotifications(persistedEmail === 'true');
    }
    if (persistedUpdates != null) {
      setSystemUpdates(persistedUpdates === 'true');
    }
  }, []);

  const persistPreferences = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('dinsight:prefs:email_notifications', String(emailNotifications));
    window.localStorage.setItem('dinsight:prefs:system_updates', String(systemUpdates));
  };

  const saveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const payload: { full_name?: string; email?: string } = {};
      if (fullName !== (user?.full_name ?? '')) {
        payload.full_name = fullName;
      }
      if (email !== (user?.email ?? '')) {
        payload.email = email;
      }

      if (Object.keys(payload).length > 0) {
        await api.users.updateProfile(payload);
        await refreshUser();
      }

      persistPreferences();
      setProfileMessage('Account settings saved.');
    } catch (error: any) {
      setProfileMessage(error?.response?.data?.message || 'Failed to save account settings.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const changePassword = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      await api.users.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated successfully.');
    } catch (error: any) {
      setPasswordError(error?.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await api.users.revokeSession(sessionId);
      await refetchSessions();
    } catch {
      // Best effort in this phase.
    }
  };

  const revokeAllSessions = async () => {
    try {
      await api.users.revokeAllSessions();
      await refetchSessions();
    } catch {
      // Best effort in this phase.
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200/60 dark:border-gray-800/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <UserCog className="h-6 w-6" />
            Account & Security
          </CardTitle>
          <CardDescription>
            Manage your profile, security credentials, active sessions, and operator preferences.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-gray-200/60 dark:border-gray-800/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Update your name and email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="auto">Auto</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-input p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(event) => setEmailNotifications(event.target.checked)}
                />
                Email notifications
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={systemUpdates}
                  onChange={(event) => setSystemUpdates(event.target.checked)}
                />
                System update notifications
              </label>
            </div>

            <Button onClick={() => void saveProfile()} disabled={isSavingProfile}>
              {isSavingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Save account settings'
              )}
            </Button>

            {profileMessage && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {profileMessage}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200/60 dark:border-gray-800/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5" />
              Password
            </CardTitle>
            <CardDescription>Change your password and secure your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <Button onClick={() => void changePassword()} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password
                </>
              ) : (
                'Change password'
              )}
            </Button>

            {passwordError && (
              <p className="text-sm text-red-600" aria-live="polite">
                {passwordError}
              </p>
            )}
            {passwordMessage && (
              <p className="flex items-center gap-2 text-sm text-emerald-600" aria-live="polite">
                <CheckCircle2 className="h-4 w-4" />
                {passwordMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/60 dark:border-gray-800/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>Review and revoke active sign-in sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-input p-3"
                >
                  <div className="text-sm">
                    <p className="font-medium">
                      {session.device || session.browser || 'Session'}
                      {session.current ? ' (Current)' : ''}
                    </p>
                    <p className="text-muted-foreground">
                      {session.location || session.ipAddress || 'Unknown location'}
                    </p>
                    <p className="text-muted-foreground">
                      {session.lastActive || 'Recently active'}
                    </p>
                  </div>
                  {!session.current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void revokeSession(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active sessions reported.</p>
          )}

          <Button variant="outline" onClick={() => void revokeAllSessions()}>
            Revoke all other sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
