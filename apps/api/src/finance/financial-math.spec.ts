import { Prisma } from '@pmcs/database';
import { describe, expect, it } from 'vitest';
import { calculateBalanceAfter, calculateDestinationAmount } from './financial-math';

describe('financial math', () => {
  it('subtracts debits from a fund balance', () => {
    const result = calculateBalanceAfter('DEBIT', new Prisma.Decimal('500'), new Prisma.Decimal('125.50'));
    expect(result.toString()).toBe('374.5');
  });

  it('adds credits to a fund balance', () => {
    const result = calculateBalanceAfter('CREDIT', new Prisma.Decimal('500'), new Prisma.Decimal('125.50'));
    expect(result.toString()).toBe('625.5');
  });

  it('calculates EUR to ETB conversion using the stored rate', () => {
    const result = calculateDestinationAmount(new Prisma.Decimal('1000'), new Prisma.Decimal('190'));
    expect(result.toString()).toBe('190000');
  });

  it('preserves high precision exchange calculations', () => {
    const result = calculateDestinationAmount(new Prisma.Decimal('12.3456'), new Prisma.Decimal('190.125678'));
    expect(result.toString()).toBe('2347.2155703168');
  });
});
