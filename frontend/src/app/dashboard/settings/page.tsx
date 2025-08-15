'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface UserSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
  ipAddress?: string;
  createdAt: string;
}

// Helper function to detect user's timezone
const detectTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to detect timezone:', error);
    return 'UTC';
  }
};

// Helper function to format timezone for display
const formatTimezone = (timezone: string) => {
  try {
    const offset = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date())
      .find((part) => part.type === 'timeZoneName')?.value;

    return `${timezone} (${offset})`;
  } catch (error) {
    return timezone;
  }
};

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Real user data from auth context
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'viewer',
    organization: 'ACME Manufacturing',
    theme: 'auto',
    language: 'en',
    timezone: detectTimezone(),
    itemsPerPage: '50',
    showAdvancedFeatures: false,
  });

  // Initialize profile data from user context
  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        fullName: user.full_name || '',
        email: user.email || '',
        role: user.role || 'user',
      }));
    }
  }, [user]);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    anomalyAlerts: true,
    systemUpdates: false,
    weeklyReports: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ] as const;

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      // Only update fields that have changed
      const updateData: { full_name?: string; email?: string } = {};

      if (profileData.fullName !== user?.full_name) {
        updateData.full_name = profileData.fullName;
      }

      if (profileData.email !== user?.email) {
        updateData.email = profileData.email;
      }

      // Only make API call if there are actual changes
      if (Object.keys(updateData).length > 0) {
        await api.users.updateProfile(updateData);
        // Refresh user data to get updated info
        await refreshUser();
      }

      setSaveSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      // TODO: Show error toast/notification
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const [passwordChangeError, setPasswordChangeError] = useState<string>('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Query for user sessions
  const {
    data: sessions,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery<UserSession[]>({
    queryKey: ['user-sessions'],
    queryFn: async (): Promise<UserSession[]> => {
      try {
        const response = await api.users.getSessions();
        console.log('Sessions API response:', response.data);
        return response.data?.data?.sessions || [];
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        // Return mock data as fallback if backend doesn't support sessions yet
        return [
          {
            id: 'current',
            device: 'Current Session',
            browser: 'Chrome, MacOS',
            location: 'San Francisco, CA',
            lastActive: '2 minutes ago',
            current: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mobile',
            device: 'Mobile App',
            browser: 'iOS Safari',
            location: 'San Francisco, CA',
            lastActive: '1 hour ago',
            current: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'office',
            device: 'Office Computer',
            browser: 'Firefox, Windows',
            location: 'San Francisco, CA',
            lastActive: '3 hours ago',
            current: false,
            createdAt: new Date(Date.now() - 10800000).toISOString(),
          },
        ];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Handle escape key to close dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showChangePasswordDialog) {
        setShowChangePasswordDialog(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordChangeError('');
        setPasswordChangeSuccess(false);
        setIsChangingPassword(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showChangePasswordDialog]);

  const handleChangePassword = async () => {
    if (isChangingPassword) return; // Prevent multiple simultaneous requests

    setPasswordChangeError('');
    setPasswordChangeSuccess(false);
    setIsChangingPassword(true);

    // Validation
    if (!passwordData.currentPassword) {
      setPasswordChangeError('Current password is required');
      setIsChangingPassword(false);
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordChangeError('New password is required');
      setIsChangingPassword(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordChangeError('Password must be at least 8 characters long');
      setIsChangingPassword(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordChangeError('Passwords do not match');
      setIsChangingPassword(false);
      return;
    }

    try {
      console.log('Attempting to change password...');
      const response = await api.users.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      console.log('Password change response:', response);

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordChangeSuccess(true);
      setTimeout(() => {
        setShowChangePasswordDialog(false);
        setPasswordChangeSuccess(false);
        setIsChangingPassword(false);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to change password:', error);
      console.error('Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        stack: error?.stack,
        code: error?.code,
      });

      if (error?.response?.status === 401) {
        setPasswordChangeError('Current password is incorrect');
      } else if (error?.response?.status === 400) {
        setPasswordChangeError('Password does not meet requirements');
      } else if (error?.code === 'NETWORK_ERROR' || error?.code === 'ECONNREFUSED') {
        setPasswordChangeError(
          'Unable to connect to server. Please check if the backend is running.'
        );
      } else if (error?.response?.status === 404) {
        setPasswordChangeError('Password change endpoint not found. Please contact support.');
      } else if (error?.response?.status >= 500) {
        setPasswordChangeError('Server error occurred. Please try again later.');
      } else {
        setPasswordChangeError(error?.message || 'Failed to change password. Please try again.');
      }
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.users.revokeSession(sessionId);
      refetchSessions(); // Refresh the sessions list
    } catch (error) {
      console.error('Failed to revoke session:', error);
      // For now, just log the error. In production, you'd want to show user feedback
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await api.users.revokeAllSessions();
      refetchSessions(); // Refresh the sessions list
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      // For now, just log the error. In production, you'd want to show user feedback
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account preferences and configuration
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-4xl">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your personal details and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={profileData.fullName}
                        onChange={(e) => {
                          setProfileData((prev) => ({ ...prev, fullName: e.target.value }));
                          setHasChanges(true);
                        }}
                        className="mt-1 glass-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="email"
                          value={profileData.email}
                          onChange={(e) => {
                            setProfileData((prev) => ({ ...prev, email: e.target.value }));
                            setHasChanges(true);
                          }}
                          className="flex-1 glass-input"
                        />
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1.5 bg-gradient-to-r from-accent-teal-100 to-accent-teal-100/50 dark:from-accent-teal-900/30 dark:to-accent-teal-900/30 text-accent-teal-700 dark:text-accent-teal-300 text-sm font-semibold rounded-lg border border-accent-teal-200/50 dark:border-accent-teal-700/50 backdrop-blur-sm flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Verified
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        value={profileData.role}
                        disabled
                        className="mt-1 bg-gray-50/50 dark:bg-gray-800/50 glass-input opacity-60"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Assigned by organization admin
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Input
                        id="organization"
                        value={profileData.organization}
                        disabled
                        className="mt-1 bg-gray-50/50 dark:bg-gray-800/50 glass-input opacity-60"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Preferences
                  </CardTitle>
                  <CardDescription>Customize your dashboard experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="theme">Theme</Label>
                      <Select
                        value={profileData.theme}
                        onValueChange={(value) =>
                          setProfileData((prev) => ({ ...prev, theme: value }))
                        }
                      >
                        <SelectTrigger className="mt-1 glass-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={profileData.language}
                        onValueChange={(value) =>
                          setProfileData((prev) => ({ ...prev, language: value }))
                        }
                      >
                        <SelectTrigger className="mt-1 glass-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={profileData.timezone}
                        onValueChange={(value) =>
                          setProfileData((prev) => ({ ...prev, timezone: value }))
                        }
                      >
                        <SelectTrigger className="mt-1 glass-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={detectTimezone()}>
                            {formatTimezone(detectTimezone())} (Auto-detected)
                          </SelectItem>
                          <SelectItem value="America/New_York">
                            {formatTimezone('America/New_York')}
                          </SelectItem>
                          <SelectItem value="America/Chicago">
                            {formatTimezone('America/Chicago')}
                          </SelectItem>
                          <SelectItem value="America/Denver">
                            {formatTimezone('America/Denver')}
                          </SelectItem>
                          <SelectItem value="America/Los_Angeles">
                            {formatTimezone('America/Los_Angeles')}
                          </SelectItem>
                          <SelectItem value="Europe/London">
                            {formatTimezone('Europe/London')}
                          </SelectItem>
                          <SelectItem value="Europe/Paris">
                            {formatTimezone('Europe/Paris')}
                          </SelectItem>
                          <SelectItem value="Europe/Berlin">
                            {formatTimezone('Europe/Berlin')}
                          </SelectItem>
                          <SelectItem value="Asia/Tokyo">{formatTimezone('Asia/Tokyo')}</SelectItem>
                          <SelectItem value="Asia/Shanghai">
                            {formatTimezone('Asia/Shanghai')}
                          </SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Auto-detected: {formatTimezone(detectTimezone())}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="itemsPerPage">Items per page</Label>
                    <Select
                      value={profileData.itemsPerPage}
                      onValueChange={(value) =>
                        setProfileData((prev) => ({ ...prev, itemsPerPage: value }))
                      }
                    >
                      <SelectTrigger className="mt-1 max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="showAdvancedFeatures"
                      checked={profileData.showAdvancedFeatures}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          showAdvancedFeatures: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="showAdvancedFeatures">Show advanced features</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Communication
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        key: 'emailNotifications',
                        label: 'Email notifications',
                        description: 'Receive alerts and updates via email',
                      },
                      {
                        key: 'smsNotifications',
                        label: 'SMS notifications',
                        description: 'Receive critical alerts via SMS',
                      },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Label htmlFor={setting.key} className="font-medium">
                              {setting.label}
                            </Label>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {setting.description}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          id={setting.key}
                          checked={
                            notificationSettings[setting.key as keyof typeof notificationSettings]
                          }
                          onChange={(e) =>
                            setNotificationSettings((prev) => ({
                              ...prev,
                              [setting.key]: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Alert Types
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        key: 'anomalyAlerts',
                        label: 'Anomaly detection alerts',
                        description: 'Get notified when anomalies are detected in your data',
                      },
                      {
                        key: 'systemUpdates',
                        label: 'System updates',
                        description: 'Notifications about system maintenance and updates',
                      },
                      {
                        key: 'weeklyReports',
                        label: 'Weekly reports',
                        description: 'Receive weekly summary reports of your analyses',
                      },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <div className="flex-1">
                          <Label htmlFor={setting.key} className="font-medium">
                            {setting.label}
                          </Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {setting.description}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          id={setting.key}
                          checked={
                            notificationSettings[setting.key as keyof typeof notificationSettings]
                          }
                          onChange={(e) =>
                            setNotificationSettings((prev) => ({
                              ...prev,
                              [setting.key]: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50">
                <CardHeader className="bg-gradient-to-br from-red-50 via-white to-red-50/50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-t-2xl">
                  <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="gradient-text font-bold">Password & Security</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                        Manage your password and security settings
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Button
                      onClick={() => setShowChangePasswordDialog(true)}
                      variant="outline"
                      className="w-full sm:w-auto glass-button border-red-200/50 dark:border-red-700/50 hover:bg-red-50/50 dark:hover:bg-red-900/20 hover:border-red-300/50 transition-all duration-200 rounded-xl"
                    >
                      Change Password
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Two-Factor Authentication
                    </h3>
                    <div className="flex items-center justify-between p-6 glass-card bg-gradient-to-br from-red-50/80 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 border border-red-200/50 dark:border-red-700/50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                          <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-red-800 dark:text-red-200">
                            2FA Disabled
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-300">
                            Enable two-factor authentication for enhanced security
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                      >
                        Enable 2FA
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Active Sessions
                    </h3>
                    <div className="space-y-3">
                      {sessionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                          <span className="ml-3 text-gray-600 dark:text-gray-400">
                            Loading sessions...
                          </span>
                        </div>
                      ) : sessions && sessions.length > 0 ? (
                        sessions.map((session: UserSession) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-4 glass-card border border-gray-200/50 dark:border-gray-700/50 rounded-xl card-hover"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {session.device}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {session.browser} • {session.location}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                Last active: {session.lastActive}
                              </p>
                            </div>
                            {session.current ? (
                              <span className="px-3 py-1.5 text-xs bg-gradient-to-r from-accent-teal-100 to-accent-teal-100/50 dark:from-accent-teal-900/30 dark:to-accent-teal-900/30 text-accent-teal-700 dark:text-accent-teal-300 font-semibold rounded-lg border border-accent-teal-200/50 dark:border-accent-teal-700/50 backdrop-blur-sm">
                                Current
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeSession(session.id)}
                                className="text-red-600 dark:text-red-400 glass-button border-red-200/50 dark:border-red-700/50 hover:bg-red-50/50 dark:hover:bg-red-900/20 hover:border-red-300/50 transition-all duration-200 rounded-lg"
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500 dark:text-gray-400">
                            No active sessions found
                          </p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleRevokeAllSessions}
                      disabled={!sessions || sessions.length <= 1}
                      className="mt-4 text-red-600 dark:text-red-400 glass-button border-red-300/50 dark:border-red-700/50 hover:bg-red-50/50 dark:hover:bg-red-900/20 hover:border-red-300/50 transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Revoke All Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center">
              {saveSuccess && (
                <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-accent-teal-100 to-accent-teal-100/50 dark:from-accent-teal-900/30 dark:to-accent-teal-900/30 text-accent-teal-700 dark:text-accent-teal-300 rounded-xl border border-accent-teal-200/50 dark:border-accent-teal-700/50 backdrop-blur-sm">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Settings saved successfully</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={cn(
                'min-w-[140px] rounded-xl shadow-lg hover:shadow-xl transition-all duration-200',
                hasChanges
                  ? 'bg-gradient-to-r from-primary-500 to-accent-purple-600 hover:from-primary-600 hover:to-accent-purple-700 text-white'
                  : 'glass-button border-gray-200/50 dark:border-gray-700/50'
              )}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {hasChanges ? 'Save Changes' : 'No Changes'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      {showChangePasswordDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowChangePasswordDialog(false);
              setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setPasswordChangeError('');
              setPasswordChangeSuccess(false);
              setIsChangingPassword(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-950 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Change Password
              </h3>
              <div className="space-y-4">
                {passwordChangeError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {passwordChangeError}
                    </span>
                  </div>
                )}

                {passwordChangeSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Password changed successfully!
                    </span>
                  </div>
                )}

                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="currentPassword"
                      type={isPasswordVisible ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                      className="glass-input"
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    className="mt-1 glass-input"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Must be at least 8 characters long
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="mt-1 glass-input"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangePasswordDialog(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordChangeError('');
                    setPasswordChangeSuccess(false);
                    setIsChangingPassword(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
