// Date formatting utilities
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(d);
  }
}

// Number formatting utilities
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(num: number, decimals: number = 1): string {
  return `${formatNumber(num, decimals)}%`;
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Status formatting utilities
export function getMachineStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-success-text bg-success-bg';
    case 'maintenance':
      return 'text-warning-text bg-warning-bg';
    case 'inactive':
      return 'text-danger-text bg-danger-bg';
    default:
      return 'text-fg-muted bg-surface-muted';
  }
}

export function getAlertSeverityColor(severity: string): string {
  switch (severity) {
    case 'low':
      return 'text-info-text bg-info-bg';
    case 'medium':
      return 'text-warning-text bg-warning-bg';
    case 'high':
      return 'text-orange-600 bg-orange-100';
    case 'critical':
      return 'text-danger-text bg-danger-bg';
    default:
      return 'text-fg-muted bg-surface-muted';
  }
}

export function getAnalysisStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-success-text bg-success-bg';
    case 'processing':
      return 'text-info-text bg-info-bg';
    case 'pending':
      return 'text-warning-text bg-warning-bg';
    case 'failed':
      return 'text-danger-text bg-danger-bg';
    default:
      return 'text-fg-muted bg-surface-muted';
  }
}

// File name utilities
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

export function truncateFileName(filename: string, maxLength: number = 30): string {
  if (filename.length <= maxLength) return filename;

  const extension = getFileExtension(filename);
  const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
  const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4) + '...';

  return truncatedName + '.' + extension;
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isStrongPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  const strength = {
    score,
    label: '',
    color: '',
  };

  if (score <= 2) {
    strength.label = 'Weak';
    strength.color = 'text-danger-text';
  } else if (score <= 4) {
    strength.label = 'Medium';
    strength.color = 'text-warning-text';
  } else {
    strength.label = 'Strong';
    strength.color = 'text-success-text';
  }

  return strength;
}
