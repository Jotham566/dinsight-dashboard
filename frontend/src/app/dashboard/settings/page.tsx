'use client';

import { useState } from 'react';
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
  Key,
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'api'>(
    'profile'
  );
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mock user data - in real app this would come from API/context
  const [profileData, setProfileData] = useState({
    fullName: 'John Doe',
    email: 'john.doe@acme.com',
    role: 'User',
    organization: 'ACME Manufacturing',
    theme: 'auto',
    language: 'en',
    timezone: 'UTC-8',
    itemsPerPage: '50',
    showAdvancedFeatures: false,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    slackIntegration: true,
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
    { id: 'api', label: 'API Keys', icon: Key },
  ] as const;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Simulate password change
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account preferences and configuration</p>
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
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
                        onChange={(e) =>
                          setProfileData((prev) => ({ ...prev, fullName: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="flex-1"
                        />
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verified
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
                        className="mt-1 bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Assigned by organization admin</p>
                    </div>
                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Input
                        id="organization"
                        value={profileData.organization}
                        disabled
                        className="mt-1 bg-gray-50"
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
                        <SelectTrigger className="mt-1">
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
                        <SelectTrigger className="mt-1">
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
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC-8">UTC-8 Pacific</SelectItem>
                          <SelectItem value="UTC-5">UTC-5 Eastern</SelectItem>
                          <SelectItem value="UTC+0">UTC+0 GMT</SelectItem>
                          <SelectItem value="UTC+1">UTC+1 CET</SelectItem>
                        </SelectContent>
                      </Select>
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Communication</h3>
                  <div className="space-y-3">
                    {[
                      {
                        key: 'emailNotifications',
                        label: 'Email notifications',
                        description: 'Receive alerts and updates via email',
                      },
                      {
                        key: 'slackIntegration',
                        label: 'Slack integration',
                        description: 'Send notifications to Slack channels',
                      },
                      {
                        key: 'smsNotifications',
                        label: 'SMS notifications',
                        description: 'Receive critical alerts via SMS (Pro feature)',
                        disabled: true,
                      },
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Label htmlFor={setting.key} className="font-medium">
                              {setting.label}
                            </Label>
                            {setting.disabled && (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Pro
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{setting.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          id={setting.key}
                          checked={
                            notificationSettings[setting.key as keyof typeof notificationSettings]
                          }
                          disabled={setting.disabled}
                          onChange={(e) =>
                            setNotificationSettings((prev) => ({
                              ...prev,
                              [setting.key]: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Types</h3>
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
                          <p className="text-sm text-gray-500">{setting.description}</p>
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
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Password & Security
                  </CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Button
                      onClick={() => setShowChangePasswordDialog(true)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      Change Password
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Two-Factor Authentication
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                        <div>
                          <p className="font-medium text-red-800">2FA Disabled</p>
                          <p className="text-sm text-red-600">
                            Enable two-factor authentication for enhanced security
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        Enable 2FA
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      {[
                        {
                          device: 'Current Session',
                          browser: 'Chrome, MacOS',
                          location: 'San Francisco, CA',
                          lastActive: '2 minutes ago',
                          current: true,
                        },
                        {
                          device: 'Mobile App',
                          browser: 'iOS Safari',
                          location: 'San Francisco, CA',
                          lastActive: '1 hour ago',
                          current: false,
                        },
                        {
                          device: 'Office Computer',
                          browser: 'Firefox, Windows',
                          location: 'San Francisco, CA',
                          lastActive: '3 hours ago',
                          current: false,
                        },
                      ].map((session, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{session.device}</p>
                            <p className="text-sm text-gray-500">
                              {session.browser} • {session.location}
                            </p>
                            <p className="text-xs text-gray-400">
                              Last active: {session.lastActive}
                            </p>
                          </div>
                          {session.current ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              Current
                            </span>
                          ) : (
                            <Button variant="outline" size="sm" className="text-red-600">
                              Revoke
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="mt-4 text-red-600 border-red-300">
                      Revoke All Sessions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage API keys for programmatic access to your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
                  <p className="text-gray-500 mb-6">
                    Create API keys to access DInsight programmatically
                  </p>
                  <Button>Create API Key</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center">
              {saveSuccess && (
                <div className="flex items-center text-green-600 mr-4">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Settings saved successfully
                </div>
              )}
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <ConfirmationDialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}
        title="Change Password"
        description={
          <div className="space-y-4 mt-4">
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
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {isPasswordVisible ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
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
                className="mt-1"
              />
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
                className="mt-1"
              />
            </div>
          </div>
        }
        confirmText="Change Password"
        cancelText="Cancel"
        variant="default"
        onConfirm={handleChangePassword}
      />
    </div>
  );
}
