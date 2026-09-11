import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';

describe('Button component', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('renders icon and text together', () => {
    render(
      <Button icon={<Plus data-testid="plus-icon" />}>
        Add Something
      </Button>
    );
    expect(screen.getByRole('button', { name: /add something/i })).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('renders icon-only button', () => {
    render(<Button icon={<Plus data-testid="plus-icon" />} aria-label="Add item" />);
    const button = screen.getByRole('button', { name: /add item/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  it('handles click events when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire click events when disabled', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders loader and disables interaction when loading', () => {
    const handleClick = vi.fn();
    render(
      <Button loading onClick={handleClick} icon={<Plus data-testid="plus-icon" />}>
        Processing
      </Button>
    );
    const button = screen.getByRole('button', { name: /processing/i });
    expect(button).toBeDisabled();
    // Icon should be replaced by loader
    expect(screen.queryByTestId('plus-icon')).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies classes for different variants', () => {
    const { rerender } = render(<Button variant="primary">Action</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Action</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-zinc-900');

    rerender(<Button variant="outline">Action</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-zinc-200');

    rerender(<Button variant="compact">Action</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-50');

    rerender(<Button variant="amber">Action</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-amber-200/80');

    rerender(<Button variant="ghost">Action</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('applies ghost hover accent correctly', () => {
    const { rerender } = render(<Button variant="ghost" hoverAccent="blue">Action</Button>);
    expect(screen.getByRole('button')).toHaveClass('hover:text-blue-600');

    rerender(<Button variant="ghost" hoverAccent="rose">Action</Button>);
    expect(screen.getByRole('button')).toHaveClass('hover:text-rose-600');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3.5');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-5');
  });
});
