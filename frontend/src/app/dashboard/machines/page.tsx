'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  BarChart3,
  Settings,
  MapPin,
  Clock,
  RefreshCw,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/format';

// Types
interface Machine {
  id: number;
  organization_id: number;
  name: string;
  model: string;
  serial_number: string;
  location: string;
  status: 'active' | 'maintenance' | 'inactive' | 'warning' | 'critical';
  last_analysis_at: string | null;
  created_at: string;
  updated_at: string;
  metadata?: {
    manufacturer?: string;
    year?: number;
    capacity?: string;
  };
  recent_analyses?: Array<{
    id: number;
    type: string;
    status: string;
    created_at: string;
  }>;
  alert_count?: number;
}

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'active' | 'maintenance' | 'inactive' | 'warning' | 'critical';

// Mock data
const mockMachines: Machine[] = [
  {
    id: 1,
    organization_id: 1,
    name: 'CNC Machine #1',
    model: 'DMG MORI NLX 2500',
    serial_number: 'SN123456789',
    location: 'Floor A-2',
    status: 'active',
    last_analysis_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: {
      manufacturer: 'DMG MORI',
      year: 2022,
      capacity: '2500kg',
    },
    recent_analyses: [
      {
        id: 1,
        type: 'Baseline Analysis',
        status: 'completed',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        type: 'Monitoring Update',
        status: 'completed',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ],
    alert_count: 0,
  },
  {
    id: 2,
    organization_id: 1,
    name: 'Mill #3',
    model: 'Haas VF-2SS',
    serial_number: 'SN987654321',
    location: 'Floor B-1',
    status: 'warning',
    last_analysis_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    metadata: {
      manufacturer: 'Haas Automation',
      year: 2021,
      capacity: '1200kg',
    },
    recent_analyses: [
      {
        id: 3,
        type: 'Anomaly Detection',
        status: 'warning',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ],
    alert_count: 2,
  },
  {
    id: 3,
    organization_id: 1,
    name: 'Press #2',
    model: 'Schuler SPNP 800',
    serial_number: 'SN456789123',
    location: 'Floor C-3',
    status: 'critical',
    last_analysis_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    metadata: {
      manufacturer: 'Schuler',
      year: 2020,
      capacity: '800t',
    },
    recent_analyses: [
      {
        id: 4,
        type: 'Critical Alert',
        status: 'critical',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ],
    alert_count: 5,
  },
  {
    id: 4,
    organization_id: 1,
    name: 'Lathe #5',
    model: 'Okuma LB3000',
    serial_number: 'SN789123456',
    location: 'Floor A-1',
    status: 'maintenance',
    last_analysis_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    metadata: {
      manufacturer: 'Okuma',
      year: 2023,
      capacity: '1500kg',
    },
    recent_analyses: [
      {
        id: 5,
        type: 'Maintenance Check',
        status: 'in_progress',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
    ],
    alert_count: 1,
  },
];

export default function MachinesPage() {
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Query for machines data
  const {
    data: machines,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['machines', statusFilter, locationFilter, searchQuery],
    queryFn: async () => {
      // In real app: await api.machines.getAll({ status: statusFilter, location: locationFilter, search: searchQuery });
      let filteredMachines = mockMachines;

      if (statusFilter !== 'all') {
        filteredMachines = filteredMachines.filter((machine) => machine.status === statusFilter);
      }

      if (locationFilter !== 'all') {
        filteredMachines = filteredMachines.filter((machine) =>
          machine.location.toLowerCase().includes(locationFilter.toLowerCase())
        );
      }

      if (searchQuery) {
        filteredMachines = filteredMachines.filter(
          (machine) =>
            machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            machine.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
            machine.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return filteredMachines;
    },
  });

  // Get unique locations for filter
  const uniqueLocations = Array.from(new Set(mockMachines.map((machine) => machine.location)));

  const getStatusIcon = (status: Machine['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <Settings className="h-5 w-5 text-blue-500" />;
      case 'inactive':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Machine['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'maintenance':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'inactive':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const handleAddMachine = () => {
    console.log('Add machine functionality');
    // Implementation would open a modal or navigate to add machine form
  };

  const handleViewMachine = (machineId: number) => {
    console.log('View machine:', machineId);
    // Implementation would navigate to machine detail page
  };

  const handleEditMachine = (machineId: number) => {
    console.log('Edit machine:', machineId);
    // Implementation would open edit modal or form
  };

  const handleDeleteMachine = (machineId: number) => {
    console.log('Delete machine:', machineId);
    // Implementation would show confirmation dialog
  };

  // Calculate stats
  const totalMachines = machines?.length || 0;
  const activeMachines = machines?.filter((m) => m.status === 'active').length || 0;
  const criticalMachines = machines?.filter((m) => m.status === 'critical').length || 0;
  const warningMachines = machines?.filter((m) => m.status === 'warning').length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Machine Management</h1>
          <p className="text-gray-500">Manage and monitor your equipment and machines</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAddMachine}>
            <Plus className="w-4 h-4 mr-2" />
            Add Machine
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Machines</p>
                <p className="text-2xl font-bold text-gray-900">{totalMachines}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeMachines}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{warningMachines}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">{criticalMachines}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'flex items-center px-3 py-1.5 text-sm rounded-md transition-colors',
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center px-3 py-1.5 text-sm rounded-md transition-colors',
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Location:</span>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All</option>
                {uniqueLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search machines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-1.5 w-full border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machines Display */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !machines || machines.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No machines found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all' || locationFilter !== 'all'
                ? 'No machines match your current filters.'
                : 'Get started by adding your first machine.'}
            </p>
            <Button onClick={handleAddMachine}>
              <Plus className="w-4 h-4 mr-2" />
              Add Machine
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <Card
              key={machine.id}
              className={cn(
                'transition-all duration-200 hover:shadow-lg cursor-pointer',
                machine.status === 'critical' ? 'border-red-200' : '',
                machine.status === 'warning' ? 'border-yellow-200' : ''
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{machine.name}</CardTitle>
                    <CardDescription className="truncate">{machine.model}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(machine.status)}
                    {machine.alert_count && machine.alert_count > 0 && (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                        {machine.alert_count}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border',
                        getStatusColor(machine.status)
                      )}
                    >
                      {machine.status.charAt(0).toUpperCase() + machine.status.slice(1)}
                    </span>
                    <div className="text-xs text-gray-500 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {machine.location}
                    </div>
                  </div>

                  {/* Last Analysis */}
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    Last:{' '}
                    {machine.last_analysis_at
                      ? formatRelativeTime(machine.last_analysis_at)
                      : 'Never'}
                  </div>

                  {/* Machine Info */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Serial: {machine.serial_number}</div>
                    {machine.metadata?.manufacturer && (
                      <div>Manufacturer: {machine.metadata.manufacturer}</div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMachine(machine.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMachine(machine.id)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {machines.map((machine) => (
                <div key={machine.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {getStatusIcon(machine.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {machine.name}
                          </h3>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border',
                              getStatusColor(machine.status)
                            )}
                          >
                            {machine.status.charAt(0).toUpperCase() + machine.status.slice(1)}
                          </span>
                          {machine.alert_count && machine.alert_count > 0 && (
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                              {machine.alert_count} alerts
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span>{machine.model}</span>
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {machine.location}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Last:{' '}
                            {machine.last_analysis_at
                              ? formatRelativeTime(machine.last_analysis_at)
                              : 'Never'}
                          </span>
                          <span>SN: {machine.serial_number}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewMachine(machine.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Analyze
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMachine(machine.id)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMachine(machine.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
