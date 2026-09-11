import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddAssetModal from '@/components/AddAssetModal';

describe('AddAssetModal component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly when open', () => {
    render(<AddAssetModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add an Asset')).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toHaveValue('home');
    expect(screen.getByLabelText(/property address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/asset name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current value/i)).toBeInTheDocument();
  });

  it('hides property address field when category is not home', () => {
    render(<AddAssetModal open={true} onOpenChange={vi.fn()} />);

    const categorySelect = screen.getByLabelText(/category/i);
    fireEvent.change(categorySelect, { target: { value: 'car' } });

    expect(screen.queryByLabelText(/property address/i)).not.toBeInTheDocument();
  });

  it('looks up home valuation and populates the current value', async () => {
    const mockValuation = {
      address: '742 Evergreen Terrace',
      formattedAddress: '742 Evergreen Terrace, Springfield, OR 97477',
      estimatedValue: 480000,
      priceRangeLow: 455000,
      priceRangeHigh: 505000,
      currency: 'USD',
      bedrooms: 4,
      bathrooms: 2.5,
      squareFootage: 2200,
      propertyType: 'Single Family',
      valuationDate: new Date().toISOString(),
      provider: 'mock',
      isSimulated: true,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, valuation: mockValuation }),
    } as Response);

    render(<AddAssetModal open={true} onOpenChange={vi.fn()} />);

    const addressInput = screen.getByLabelText(/property address/i);
    fireEvent.change(addressInput, { target: { value: '742 Evergreen Terrace' } });

    const lookupButton = screen.getByRole('button', { name: /look up/i });
    fireEvent.click(lookupButton);

    await waitFor(() => {
      expect(screen.getByText('Estimated Market Value')).toBeInTheDocument();
    });

    expect(screen.getByText('$480,000.00')).toBeInTheDocument();
    expect(screen.getByText(/4 beds/i)).toBeInTheDocument();
    expect(screen.getByText(/2.5 baths/i)).toBeInTheDocument();
    expect(screen.getByText(/2,200 sq ft/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current value/i)).toHaveValue(480000);
    expect(screen.getByLabelText(/asset name/i)).toHaveValue(
      '742 Evergreen Terrace, Springfield, OR 97477'
    );
  });

  it('shows error when address lookup fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Address could not be located.' }),
    } as Response);

    render(<AddAssetModal open={true} onOpenChange={vi.fn()} />);

    const addressInput = screen.getByLabelText(/property address/i);
    fireEvent.change(addressInput, { target: { value: 'Invalid 123 Street' } });

    const lookupButton = screen.getByRole('button', { name: /look up/i });
    fireEvent.click(lookupButton);

    await waitFor(() => {
      expect(screen.getByText('Address could not be located.')).toBeInTheDocument();
    });
  });

  it('submits manual asset with address stored as officialName', async () => {
    const handleSave = vi.fn();
    render(<AddAssetModal open={true} onOpenChange={vi.fn()} onSave={handleSave} />);

    fireEvent.change(screen.getByLabelText(/property address/i), {
      target: { value: '123 Ocean Drive, Miami, FL' },
    });
    fireEvent.change(screen.getByLabelText(/asset name/i), {
      target: { value: 'Beach House' },
    });
    fireEvent.change(screen.getByLabelText(/current value/i), {
      target: { value: '750000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add asset/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const savedAsset = handleSave.mock.calls[0][0];
    expect(savedAsset.name).toBe('Beach House');
    expect(savedAsset.officialName).toBe('123 Ocean Drive, Miami, FL');
    expect(savedAsset.subtype).toBe('home');
    expect(savedAsset.balances.current).toBe(750000);
  });
});
