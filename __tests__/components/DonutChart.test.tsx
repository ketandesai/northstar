import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DonutChart, { DonutSlice } from '@/components/charts/DonutChart';

const slices: DonutSlice[] = [
  { id: 'cash', label: 'Cash', value: 25000, color: '#10b981' },
  { id: 'retirement', label: 'Retirement', value: 100000, color: '#2563eb' },
  { id: 'property', label: 'Property', value: 500000, color: '#0ea5e9' },
];

describe('DonutChart component', () => {
  it('renders one arc per slice and a center total', () => {
    render(
      <DonutChart data={slices} centerValue="$625,000" centerLabel="Total Assets" />
    );

    const chart = screen.getByRole('img', { name: /donut chart/i });
    expect(chart.querySelectorAll('path')).toHaveLength(3);

    expect(screen.getByText('$625,000')).toBeInTheDocument();
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
  });

  it('renders legend entries with labels, values, and percentages', () => {
    render(<DonutChart data={slices} />);

    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Retirement')).toBeInTheDocument();
    expect(screen.getByText('Property')).toBeInTheDocument();

    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('$500,000')).toBeInTheDocument();
    expect(screen.getByText('4%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('honors a custom formatValue function', () => {
    const formatValue = vi.fn((value: number) => `${value} X`);
    render(<DonutChart data={slices} formatValue={formatValue} />);

    expect(screen.getByText('500000 X')).toBeInTheDocument();
    expect(formatValue).toHaveBeenCalledTimes(3);
  });

  it('dims other slices when hovering a legend row', () => {
    render(<DonutChart data={slices} />);

    const path = screen.getByRole('img').querySelector('path')!;
    expect(path.getAttribute('opacity')).toBe('1');

    fireEvent.mouseEnter(screen.getByText('Retirement'));
    const paths = screen.getByRole('img').querySelectorAll('path');
    expect(paths[1].getAttribute('opacity')).toBe('1');
    expect(paths[0].getAttribute('opacity')).toBe('0.25');
    expect(paths[2].getAttribute('opacity')).toBe('0.25');
  });

  it('does not render a background ring when there is data', () => {
    render(<DonutChart data={slices} />);
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(0);
  });

  it('renders only a placeholder ring when there is no data', () => {
    render(<DonutChart data={[]} />);
    expect(screen.getByRole('img').querySelectorAll('circle')).toHaveLength(1);
    expect(screen.getByRole('img').querySelectorAll('path')).toHaveLength(0);
  });

  it('shows no legend rows when there is no data', () => {
    render(<DonutChart data={[]} />);
    expect(screen.queryByText('Cash')).toBeNull();
    expect(document.querySelectorAll('li')).toHaveLength(0);
  });
});