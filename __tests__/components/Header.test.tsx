import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '@/components/Header';

describe('Header component', () => {
  it('renders the Northstar brand', () => {
    render(<Header />);
    expect(screen.getByText('Northstar')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('does not render an Add Account button in the header', () => {
    render(<Header />);
    expect(screen.queryByRole('button', { name: /add account/i })).not.toBeInTheDocument();
  });
});