import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  DEFAULT_GUEST_USER_ID,
  AccountRow,
  mapAccountRowToConnectedAccount,
} from '@/types/database';
import { upsertBalanceSnapshot } from '@/lib/balance-history';
import { CATEGORY_OPTIONS } from '@/types/account';

const VALID_CATEGORIES = new Set(CATEGORY_OPTIONS.map((opt) => opt.value));

/**
 * Updates an existing account / manual asset. Used to revalue manually
 * entered assets (home, car, private equity) and rename them. Writing a
 * fresh balance-history snapshot keeps the net-worth chart in step.
 */
export async function PATCH(
  req: Request,
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

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name : undefined;
    const type = typeof body.type === 'string' ? body.type : undefined;
    const subtype = typeof body.subtype === 'string' ? body.subtype : undefined;
    const category =
      typeof body.category === 'string' ? body.category.trim().toLowerCase() : undefined;
    const isoCurrencyCode =
      typeof body.isoCurrencyCode === 'string' ? body.isoCurrencyCode : undefined;
    const currentBalance =
      body.currentBalance === undefined || body.currentBalance === null
        ? null
        : Number(body.currentBalance);

    if (
      name === undefined &&
      type === undefined &&
      subtype === undefined &&
      category === undefined &&
      isoCurrencyCode === undefined &&
      currentBalance === null
    ) {
      return NextResponse.json(
        { error: 'No updateable fields provided', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    if (name !== undefined && name.trim() === '') {
      return NextResponse.json(
        { error: 'Name cannot be empty', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }
    if (currentBalance !== null && Number.isNaN(currentBalance)) {
      return NextResponse.json(
        { error: 'Current balance must be a number', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }
    if (category !== undefined && !VALID_CATEGORIES.has(category)) {
      return NextResponse.json(
        {
          error: `Category must be one of: ${[...VALID_CATEGORIES].join(', ')}`,
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [id, DEFAULT_GUEST_USER_ID];
    const setClause: string[] = [];

    if (name !== undefined) {
      values.push(name.trim());
      setClause.push(`name = $${values.length}`);
      updates.push('name');
    }
    if (type !== undefined) {
      values.push(type.trim().toLowerCase());
      setClause.push(`type = $${values.length}`);
      updates.push('type');
    }
    if (subtype !== undefined) {
      values.push(subtype.trim().toLowerCase());
      setClause.push(`subtype = $${values.length}`);
      updates.push('subtype');
    }
    if (category !== undefined) {
      values.push(category);
      setClause.push(`category = $${values.length}`);
      updates.push('category');
    }
    if (isoCurrencyCode !== undefined) {
      values.push(isoCurrencyCode.trim().toUpperCase());
      setClause.push(`iso_currency_code = $${values.length}`);
      updates.push('iso_currency_code');
    }
    if (currentBalance !== null) {
      values.push(currentBalance);
      setClause.push(`available_balance = NULL`);
      setClause.push(`current_balance = $${values.length}`);
      updates.push('current_balance');
    }
    setClause.push(`updated_at = now()`);

    const updated = await query<AccountRow>(
      `UPDATE accounts
       SET ${setClause.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      values
    );

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Account not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const account = mapAccountRowToConnectedAccount(updated[0]);

    if (updates.includes('current_balance')) {
      await upsertBalanceSnapshot({
        accountId: account.id,
        userId: DEFAULT_GUEST_USER_ID,
        currentBalance: account.balances.current,
        availableBalance: account.balances.available,
        isoCurrencyCode: account.balances.isoCurrencyCode,
        source: 'manual',
      });
    }

    return NextResponse.json({
      success: true,
      account,
      updated: updates,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Server error updating account:', err);
    return NextResponse.json(
      {
        error: err.message || 'Unexpected server error while updating account',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

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
