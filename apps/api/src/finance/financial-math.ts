import { Prisma } from '@pmcs/database';

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export function calculateBalanceAfter(
  direction: LedgerDirection,
  balanceBefore: Prisma.Decimal,
  amount: Prisma.Decimal,
): Prisma.Decimal {
  return direction === 'DEBIT' ? balanceBefore.sub(amount) : balanceBefore.add(amount);
}

export function calculateDestinationAmount(
  sourceAmount: Prisma.Decimal,
  exchangeRate: Prisma.Decimal,
): Prisma.Decimal {
  return sourceAmount.mul(exchangeRate);
}
