import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
    expect(screen.getByText(/no bank accounts or assets yet/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Across 2 accounts & assets/i)).toBeInTheDocument();
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

  it('calls onRefreshBalances when refresh button is clicked', () => {
    const handleRefresh = vi.fn();
    renderWithProvider(
      <ConnectedAccountsList accounts={mockAccounts} onRefreshBalances={handleRefresh} />
    );

    const refreshButton = screen.getByRole('button', { name: /refresh balances/i });
    fireEvent.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalled();
  });

  it('disables refresh button while refreshing', () => {
    renderWithProvider(
      <ConnectedAccountsList accounts={mockAccounts} onRefreshBalances={() => {}} isRefreshing />
    );

    const refreshButton = screen.getByRole('button', { name: /refresh balance/i });
    expect(refreshButton).toBeDisabled();
  });

  it('shows the last updated time when provided', () => {
    renderWithProvider(
      <ConnectedAccountsList
        accounts={mockAccounts}
        lastRefreshedAt="2026-09-06T12:00:00.000Z"
      />
    );

    expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
  });

  it('renders section action buttons in Linked Accounts and Other Assets headers', () => {
    renderWithProvider(<ConnectedAccountsList accounts={mockAccounts} />);

    const linkedSectionHeader = screen.getByText('Linked Accounts').closest('div')!.parentElement!;
    expect(
      within(linkedSectionHeader).getByRole('button', { name: /add account/i })
    ).toBeInTheDocument();

    const assetsSectionHeader = screen.getByText('Other Assets').closest('div')!.parentElement!;
    expect(
      within(assetsSectionHeader).getByRole('button', { name: /add asset/i })
    ).toBeInTheDocument();
  });

  it('opens add asset modal when clicking Add Asset in Other Assets section', () => {
    renderWithProvider(<ConnectedAccountsList accounts={mockAccounts} />);

    const assetsSectionHeader = screen.getByText('Other Assets').closest('div')!.parentElement!;
    const addAssetBtn = within(assetsSectionHeader).getByRole('button', { name: /add asset/i });
    fireEvent.click(addAssetBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('triggers Plaid open when clicking Add Account in Linked Accounts section', () => {
    renderWithProvider(<ConnectedAccountsList accounts={mockAccounts} />);

    const linkedSectionHeader = screen.getByText('Linked Accounts').closest('div')!.parentElement!;
    const addAccountBtn = within(linkedSectionHeader).getByRole('button', { name: /add account/i });
    fireEvent.click(addAccountBtn);

    expect(mockOpen).toHaveBeenCalled();
  });

  describe('manual assets', () => {
    const mockAsset: ConnectedAccount = {
      id: 'asset_home_1',
      name: 'Primary Home',
      officialName: 'Primary Home',
      mask: '',
      type: 'asset',
      subtype: 'home',
      balances: {
        available: null,
        current: 500000,
        isoCurrencyCode: 'USD',
      },
      institution: {
        id: 'manual_asset',
        name: 'Home',
      },
      connectedAt: '2026-09-08T12:00:00.000Z',
    };

    it('renders assets in the Other Assets section with their value', () => {
      renderWithProvider(
        <ConnectedAccountsList accounts={[...mockAccounts, mockAsset]} />
      );

      expect(screen.getByText('Other Assets')).toBeInTheDocument();
      expect(screen.getByText('Primary Home')).toBeInTheDocument();
      expect(screen.getByText('$500,000.00')).toBeInTheDocument();
    });

    it('includes asset values in the total net balance', () => {
      renderWithProvider(
        <ConnectedAccountsList accounts={[...mockAccounts, mockAsset]} />
      );
      // 2500 + 15000 + 500000 = $517,500.00
      expect(screen.getByText('$517,500.00')).toBeInTheDocument();
    });

    it('does not render a bank mask for assets', () => {
      renderWithProvider(
        <ConnectedAccountsList accounts={[...mockAccounts, mockAsset]} />
      );

      // Only the two bank accounts show masks; the asset row must not.
      expect(screen.getAllByText(/•••• \d/)).toHaveLength(2);
    });

    it('adds a new asset through the add asset modal', async () => {
      const handleAdd = vi.fn();
      renderWithProvider(<ConnectedAccountsList accounts={[]} onAccountsAdded={handleAdd} />);

      fireEvent.click(screen.getByRole('button', { name: /add asset/i }));

      const dialog = screen.getByRole('dialog');
      const { getByLabelText: labelIn, getByRole: roleIn } = within(dialog);

      fireEvent.change(labelIn(/asset name/i), {
        target: { value: 'Tesla Model 3' },
      });
      fireEvent.change(labelIn(/category/i), {
        target: { value: 'car' },
      });
      fireEvent.change(labelIn(/current value/i), {
        target: { value: '42000' },
      });

      fireEvent.click(roleIn('button', { name: /add asset/i }));

      expect(handleAdd).toHaveBeenCalledTimes(1);
      expect(handleAdd.mock.calls[0][0]).toHaveLength(1);
      const saved = handleAdd.mock.calls[0][0][0];
      expect(saved).toMatchObject({
        name: 'Tesla Model 3',
        type: 'asset',
        subtype: 'car',
        balances: { current: 42000, isoCurrencyCode: 'USD' },
      });
      expect(saved.id).toMatch(/^asset_/);
    });

    it('edits an asset value through the edit modal', () => {
      const handleUpdate = vi.fn().mockResolvedValue(undefined);
      renderWithProvider(
        <ConnectedAccountsList
          accounts={[mockAsset]}
          onUpdateAccount={handleUpdate}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /edit asset/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/asset name/i)).toHaveValue('Primary Home');

      fireEvent.change(screen.getByLabelText(/current value/i), {
        target: { value: '525000' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      expect(handleUpdate).toHaveBeenCalledTimes(1);
      expect(handleUpdate).toHaveBeenCalledWith('asset_home_1', {
        name: 'Primary Home',
        subtype: 'home',
        currentBalance: 525000,
      });
    });
  });
});
