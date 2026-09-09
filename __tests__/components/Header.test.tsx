import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '@/components/Header';
import { PlaidLinkProvider } from '@/components/PlaidLinkProvider';

const mockOpen = vi.fn();

vi.mock('react-plaid-link', () => ({
  usePlaidLink: vi.fn(() => ({
    open: mockOpen,
    ready: true,
    error: null,
  })),
}));

describe('Header component', () => {
  const renderWithProvider = (ui: React.ReactElement) =>
    render(<PlaidLinkProvider>{ui}</PlaidLinkProvider>);

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ link_token: 'link-mock-token-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('renders the Northstar brand', () => {
    renderWithProvider(<Header />);
    expect(screen.getByText('Northstar')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('renders an Add Account button', () => {
    renderWithProvider(<Header />);
    expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument();
  });
});