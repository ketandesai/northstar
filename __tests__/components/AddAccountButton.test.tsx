import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddAccountButton from '@/components/AddAccountButton';

const mockOpen = vi.fn();
let mockReady = true;

vi.mock('react-plaid-link', () => ({
  usePlaidLink: vi.fn(() => ({
    open: mockOpen,
    ready: mockReady,
    error: null,
  })),
}));

describe('AddAccountButton component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReady = true;
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('/api/plaid/create-link-token')) {
        return Promise.resolve(
          new Response(JSON.stringify({ link_token: 'link-mock-token-123' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('renders Add Account button', () => {
    render(<AddAccountButton />);
    expect(screen.getByRole('button', { name: /add account/i })).toBeInTheDocument();
  });

  it('calls Plaid open when clicked and ready', () => {
    render(<AddAccountButton />);
    const button = screen.getByRole('button', { name: /add account/i });

    fireEvent.click(button);
    expect(mockOpen).toHaveBeenCalled();
  });

  it('displays error message when token creation fails', async () => {
    mockReady = false;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: 'Plaid credentials not configured',
            code: 'PLAID_NOT_CONFIGURED',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );

    render(<AddAccountButton />);
    const button = screen.getByRole('button', { name: /add account/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Plaid credentials not configured/i)).toBeInTheDocument();
    });
  });
});
