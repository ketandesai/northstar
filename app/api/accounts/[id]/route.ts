import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { DEFAULT_GUEST_USER_ID } from '@/types/database';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required', code: 'MISSING_ACCOUNT_ID' },
        { status: 400 }
      );
    }

    await query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [
      id,
      DEFAULT_GUEST_USER_ID,
    ]);

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Server error deleting account:', err);
    return NextResponse.json(
      {
        error: err.message || 'Unexpected server error while deleting account',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
