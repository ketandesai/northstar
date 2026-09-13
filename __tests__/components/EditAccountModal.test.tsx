import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditAccountModal from '@/components/accounts/EditAccountModal';
import { ConnectedAccount } from '@/types/account';

const mockAccount: ConnectedAccount = {
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
};

const renderModal = (props: {
  open?: boolean;
  account?: ConnectedAccount;
  onUpdate?: (accountId: string, patch: { name?: string; subtype?: string }) => void | Promise<void>;
  onOpenChange?: (open: boolean) => void;
} = {}) => {
  const {
    open = true,
    account = mockAccount,
    onUpdate = vi.fn(),
    onOpenChange = vi.fn(),
  } = props;
  return render(
    <EditAccountModal
      open={open}
      onOpenChange={onOpenChange}
      account={account}
      onUpdate={onUpdate}
    />
  );
};

describe('EditAccountModal component', () => {
  it('renders null when closed', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pre-fills the form with the account name and type', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/account name/i)).toHaveValue('Total Checking');
    expect(screen.getByLabelText(/account type/i)).toHaveValue('checking');
    expect(screen.getByLabelText(/card/i)).toHaveValue('cash');
  });

  it('defaults an unknown subtype to Other', () => {
    renderModal({
      account: {
        ...mockAccount,
        subtype: 'private_banking',
      },
    });
    expect(screen.getByLabelText(/account type/i)).toHaveValue('other');
  });

  it('calls onUpdate with the edited name and type and closes', async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined);
    const handleOpenChange = vi.fn();
    renderModal({ onUpdate: handleUpdate, onOpenChange: handleOpenChange });

    fireEvent.change(screen.getByLabelText(/account name/i), {
      target: { value: 'Everyday Checking' },
    });
    fireEvent.change(screen.getByLabelText(/account type/i), {
      target: { value: 'savings' },
    });
    fireEvent.change(screen.getByLabelText(/card/i), {
      target: { value: 'retirement' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(handleUpdate).toHaveBeenCalledTimes(1);
    expect(handleUpdate).toHaveBeenCalledWith('acc_1', {
      name: 'Everyday Checking',
      subtype: 'savings',
      category: 'retirement',
    });
    await waitFor(() => expect(handleOpenChange).toHaveBeenCalledWith(false));
  });

  it('shows a validation error for an empty name', async () => {
    const handleUpdate = vi.fn();
    renderModal({ onUpdate: handleUpdate });

    fireEvent.change(screen.getByLabelText(/account name/i), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(handleUpdate).not.toHaveBeenCalled();
    expect(screen.getByText(/please enter a name/i)).toBeInTheDocument();
  });

  it('closes on cancel without updating', () => {
    const handleUpdate = vi.fn();
    const handleOpenChange = vi.fn();
    renderModal({ onUpdate: handleUpdate, onOpenChange: handleOpenChange });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(handleUpdate).not.toHaveBeenCalled();
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});