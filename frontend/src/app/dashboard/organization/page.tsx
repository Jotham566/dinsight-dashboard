'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  Settings,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Crown,
  Shield,
  Eye,
  UserPlus,
  Edit,
  Trash2,
  Factory,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  RefreshCw,
  Globe,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/format';

// Types
interface Organization {
  id: number;
  name: string;
  description: string;
  industry: string;
  founded_year: number;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  metadata?: {
    website?: string;
    phone?: string;
    address?: string;
    logo_url?: string;
  };
}

interface TeamMember {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  last_login_at: string | null;
  created_at: string;
  avatar_url?: string;
}

interface OrganizationStats {
  total_members: number;
  total_machines: number;
  total_analyses: number;
  active_alerts: number;
}

// Mock data
const mockOrganization: Organization = {
  id: 1,
  name: 'ACME Manufacturing Corp',
  description: 'Leading manufacturer of precision equipment and machinery',
  industry: 'Manufacturing',
  founded_year: 2020,
  plan: 'pro',
  status: 'active',
  created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  metadata: {
    website: 'https://acme-manufacturing.com',
    phone: '+1 (555) 123-4567',
    address: '123 Industrial Blvd, Manufacturing City, MC 12345',
    logo_url: '/api/placeholder/80/80',
  },
};

const mockStats: OrganizationStats = {
  total_members: 12,
  total_machines: 15,
  total_analyses: 247,
  active_alerts: 3,
};

const mockTeamMembers: TeamMember[] = [
  {
    id: 1,
    full_name: 'John Doe',
    email: 'john@acme.com',
    role: 'admin',
    status: 'active',
    last_login_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    full_name: 'Jane Smith',
    email: 'jane@acme.com',
    role: 'member',
    status: 'active',
    last_login_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    full_name: 'Bob Johnson',
    email: 'bob@acme.com',
    role: 'viewer',
    status: 'active',
    last_login_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    full_name: 'Alice Brown',
    email: 'alice@acme.com',
    role: 'member',
    status: 'active',
    last_login_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    full_name: 'Charlie Wilson',
    email: 'charlie@acme.com',
    role: 'member',
    status: 'pending',
    last_login_at: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function OrganizationPage() {
  // State management
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Queries
  const {
    data: organization,
    isLoading: orgLoading,
    refetch: refetchOrganization,
  } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      // In real app: await api.organization.getCurrent();
      return mockOrganization;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['organization-stats'],
    queryFn: async () => {
      // In real app: await api.organization.getStats();
      return mockStats;
    },
  });

  const {
    data: teamMembers,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      // In real app: await api.organization.getMembers();
      return mockTeamMembers;
    },
  });

  const getRoleIcon = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'member':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'member':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'viewer':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'inactive':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPlanColor = (plan: Organization['plan']) => {
    switch (plan) {
      case 'enterprise':
        return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'pro':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'free':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const handleInviteMember = () => {
    console.log('Invite member functionality');
    setInviteModalOpen(true);
  };

  const handleEditMember = (memberId: number) => {
    console.log('Edit member:', memberId);
  };

  const handleRemoveMember = (memberId: number) => {
    console.log('Remove member:', memberId);
  };

  const handleEditOrganization = () => {
    setEditingOrganization(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-gray-500">Manage your organization settings and team members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchOrganization()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleEditOrganization}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Organization Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Organization Information
            </CardTitle>
            <CardDescription>Basic information about your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {orgLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Logo and Name */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-gray-900">{organization?.name}</h2>
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border',
                          getPlanColor(organization?.plan || 'free')
                        )}
                      >
                        <Award className="w-3 h-3 mr-1" />
                        {organization?.plan?.toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                          organization?.status === 'active'
                            ? 'text-green-600 bg-green-100'
                            : 'text-red-600 bg-red-100'
                        )}
                      >
                        {organization?.status === 'active' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {organization?.status
                          ? organization.status.charAt(0).toUpperCase() +
                            organization.status.slice(1)
                          : 'Unknown'}
                      </span>
                    </div>
                    <p className="text-gray-600">{organization?.description}</p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Factory className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Industry</div>
                      <div className="text-sm text-gray-600">{organization?.industry}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Founded</div>
                      <div className="text-sm text-gray-600">{organization?.founded_year}</div>
                    </div>
                  </div>
                  {organization?.metadata?.website && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Globe className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Website</div>
                        <a
                          href={organization.metadata.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          {organization.metadata.website.replace('https://', '')}
                        </a>
                      </div>
                    </div>
                  )}
                  {organization?.metadata?.phone && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Phone</div>
                        <div className="text-sm text-gray-600">{organization.metadata.phone}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Address */}
                {organization?.metadata?.address && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Address</div>
                      <div className="text-sm text-gray-600">{organization.metadata.address}</div>
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleEditOrganization}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Organization
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Statistics</CardTitle>
            <CardDescription>Overview of your organization metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{stats?.total_members}</div>
                  <div className="text-sm text-blue-700 flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" />
                    Members
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{stats?.total_machines}</div>
                  <div className="text-sm text-green-700 flex items-center justify-center gap-1">
                    <Factory className="w-3 h-3" />
                    Machines
                  </div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-900">{stats?.total_analyses}</div>
                  <div className="text-sm text-purple-700 flex items-center justify-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Analyses
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-900">{stats?.active_alerts}</div>
                  <div className="text-sm text-red-700 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Active Alerts
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Manage your organization's team members and their roles
            </CardDescription>
          </div>
          <Button onClick={handleInviteMember}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">
                        {member.full_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-gray-900">{member.full_name}</span>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border',
                            getRoleColor(member.role)
                          )}
                        >
                          {getRoleIcon(member.role)}
                          <span className="ml-1">{member.role}</span>
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                            getStatusColor(member.status)
                          )}
                        >
                          {member.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </span>
                        <span className="text-xs">
                          Last login:{' '}
                          {member.last_login_at
                            ? formatRelativeTime(member.last_login_at)
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditMember(member.id)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    {member.role !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Settings (Quick Access) */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Quick access to organization configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Security Settings</span>
                </div>
                <span className="text-xs text-gray-500">
                  Manage access controls and permissions
                </span>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">General Settings</span>
                </div>
                <span className="text-xs text-gray-500">Organization profile and preferences</span>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4" />
                  <span className="font-medium">Billing & Plans</span>
                </div>
                <span className="text-xs text-gray-500">Manage subscription and billing</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
