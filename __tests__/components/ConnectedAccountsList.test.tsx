import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectedAccountsList from '@/components/ConnectedAccountsList';
import { PlaidLinkProvider } from '@/components/PlaidLinkProvider';
import { ConnectedAccount } from '@/types/account';

const mockOpen = vi.fn();

vi.mock('react-plaid-link', () => ({
  usePlaidLink: vi.fn(() => ({
    open: mockOpen,
    ready: true,
    error: null,
  })),
}));

const mockAccounts: ConnectedAccount[] = [
  {
    id: 'acc_1',
    name: 'Total Checking',
    officialName: 'Chase Total Checking',
    mask: '4321',
    type: 'depository',
    subtype: 'checking',
    balances: {
      available: 2500,
      current: 2500,
      isoCurrencyCode: 'USD',
    },
    institution: {
      id: 'ins_chase',
      name: 'Chase Bank',
    },
  },
  {
    id: 'acc_2',
    name: 'Premier Savings',
    officialName: 'Chase Premier Savings',
    mask: '8765',
    type: 'depository',
    subtype: 'savings',
    balances: {
      available: 15000,
      current: 15000,
      isoCurrencyCode: 'USD',
    },
    institution: {
      id: 'ins_chase',
      name: 'Chase Bank',
    },
  },
];

describe('ConnectedAccountsList component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ link_token: 'link-mock-token-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  const renderWithProvider = (ui: React.ReactElement) =>
    render(<PlaidLinkProvider>{ui}</PlaidLinkProvider>);

  it('renders empty state when no accounts are connected', () => {
    renderWithProvider(<ConnectedAccountsList accounts={[]} />);
    expect(screen.getByText(/no bank accounts connected yet/i)).toBeInTheDocument();
  });

  it('renders linked accounts with names, masks, and balances', () => {
    renderWithProvider(<ConnectedAccountsList accounts={mockAccounts} />);

    expect(screen.getByText('Total Checking')).toBeInTheDocument();
    expect(screen.getByText('Premier Savings')).toBeInTheDocument();
    expect(screen.getByText(/•••• 4321/)).toBeInTheDocument();
    expect(screen.getByText(/•••• 8765/)).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    expect(screen.getByText('$15,000.00')).toBeInTheDocument();
  });

  it('displays correct aggregate net balance', () => {
    renderWithProvider(<ConnectedAccountsList accounts={mockAccounts} />);
    // 2500 + 15000 = $17,500.00
    expect(screen.getByText('$17,500.00')).toBeInTheDocument();
    expect(screen.getByText(/Across 2 linked accounts/i)).toBeInTheDocument();
  });

  it('calls onRemoveAccount when delete button is clicked', () => {
    const handleRemove = vi.fn();
    renderWithProvider(
      <ConnectedAccountsList accounts={mockAccounts} onRemoveAccount={handleRemove} />
    );

    const removeButtons = screen.getAllByRole('button', { name: /disconnect account/i });
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]);
    expect(handleRemove).toHaveBeenCalledWith('acc_1');
  });
});
