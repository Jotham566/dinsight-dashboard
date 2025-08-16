'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, CheckCircle, Globe, Clock, FileText, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Timezone detection helper
const detectTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

const formatTimezone = (tz: string) => {
  const parts = tz.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
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

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    
    try {
      // Only update fields that have changed
      const updateData: any = {};
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
      alert('Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header with Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/settings')}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your personal information and preferences
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Changes saved
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Personal Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your personal details and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profileData.fullName}
                onChange={(e) => {
                  setProfileData((prev) => ({ ...prev, fullName: e.target.value }));
                  setHasChanges(true);
                }}
                className="mt-1"
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
                  className="flex-1"
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
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Preferences
          </CardTitle>
          <CardDescription>Customize your application experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={profileData.theme}
                onValueChange={(value) => {
                  setProfileData((prev) => ({ ...prev, theme: value }));
                  setHasChanges(true);
                }}
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
                onValueChange={(value) => {
                  setProfileData((prev) => ({ ...prev, language: value }));
                  setHasChanges(true);
                }}
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
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={profileData.timezone}
                onValueChange={(value) => {
                  setProfileData((prev) => ({ ...prev, timezone: value }));
                  setHasChanges(true);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={detectTimezone()}>
                    {formatTimezone(detectTimezone())} (Auto-detected)
                  </SelectItem>
                  <SelectItem value="America/New_York">
                    Eastern Time (New York)
                  </SelectItem>
                  <SelectItem value="America/Chicago">
                    Central Time (Chicago)
                  </SelectItem>
                  <SelectItem value="America/Denver">
                    Mountain Time (Denver)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific Time (Los Angeles)
                  </SelectItem>
                  <SelectItem value="Europe/London">
                    GMT (London)
                  </SelectItem>
                  <SelectItem value="Europe/Paris">
                    CET (Paris)
                  </SelectItem>
                  <SelectItem value="Asia/Tokyo">
                    JST (Tokyo)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Display Settings
          </CardTitle>
          <CardDescription>Configure how data is displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="itemsPerPage">Items per page</Label>
            <Select
              value={profileData.itemsPerPage}
              onValueChange={(value) => {
                setProfileData((prev) => ({ ...prev, itemsPerPage: value }));
                setHasChanges(true);
              }}
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showAdvancedFeatures"
              checked={profileData.showAdvancedFeatures}
              onChange={(e) => {
                setProfileData((prev) => ({
                  ...prev,
                  showAdvancedFeatures: e.target.checked,
                }));
                setHasChanges(true);
              }}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="showAdvancedFeatures">Show advanced features</Label>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        For security settings, notifications, and more options, visit the{' '}
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="text-primary-600 hover:underline"
        >
          Settings page
        </button>
        .
      </div>
    </div>
  );
}