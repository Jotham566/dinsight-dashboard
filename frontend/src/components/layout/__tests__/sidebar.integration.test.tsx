import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/layout/sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Operator One', role: 'user' },
  }),
}));

describe('Sidebar integration', () => {
  it('shows only the final 5-page IA links', () => {
    render(<Sidebar isOpen onClose={() => undefined} />);

    expect(screen.getByRole('link', { name: /Machine Status/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Data Ingestion/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Live Monitor/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Health Insights/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Account & Security/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Visualization/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Streaming/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Settings/i })).not.toBeInTheDocument();
  });
});
