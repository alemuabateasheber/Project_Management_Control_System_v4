import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@pmcs/database';
import type { TenantContext } from '@pmcs/database';
import { PrismaService } from '../prisma/prisma.service';
import type { TransactionQueryDto } from './dto/transaction-query.dto';
import type { CreateBudgetDto } from './dto/budget.dto';
import type { ReverseTransactionDto } from './dto/reversal.dto';
import { calculateBalanceAfter, calculateDestinationAmount } from './financial-math';

type SingleFundType = 'INCOME' | 'EXPENSE';

type SingleFundInput = {
  transactionNumber: string;
  transactionDate: Date;
  fundId: string;
  currency: string;
  amount: string;
  categoryId?: string;
  projectId?: string;
  reference?: string;
  description?: string;
  counterpartyCode?: string;
};

type TransferInput = {
  transactionNumber: string;
  transactionDate: Date;
  sourceFundId: string;
  destinationFundId: string;
  sourceAmount: string;
  destinationAmount: string;
  sourceCurrency: string;
  destinationCurrency: string;
  exchangeRate?: string;
  fee?: string;
  reference?: string;
  description?: string;
};

type ConversionInput = TransferInput & {
  conversionDate: Date;
};

@Injectable()
export class FinancialLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async listFunds(tenant: TenantContext) {
    return this.prisma.withTenant(tenant, (tx) =>
      tx.fund.findMany({
        where: { organizationId: tenant.organizationId, status: 'active' },
        orderBy: [{ currency: 'asc' }, { code: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          currency: true,
          openingBalance: true,
          currentBalance: true,
          allowOverdraft: true,
          status: true,
          version: true,
          updatedAt: true,
        },
      }),
    );
  }

  async postIncome(tenant: TenantContext, input: SingleFundInput) {
    return this.postSingleFund(tenant, 'INCOME', input);
  }

  async listTransactions(tenant: TenantContext, query: TransactionQueryDto) {
    return this.prisma.withTenant(tenant, async (tx) => {
      const where: Prisma.FinancialTransactionWhereInput = {
        organizationId: tenant.organizationId,
        ...(query.fromDate || query.toDate
          ? {
              transactionDate: {
                ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
                ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
              },
            }
          : {}),
        ...(query.transactionType ? { transactionType: query.transactionType } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.reference
          ? { reference: { contains: query.reference, mode: 'insensitive' } }
          : {}),
        ...(query.fundId || query.currency
          ? {
              entries: {
                some: {
                  ...(query.fundId ? { fundId: query.fundId } : {}),
                  ...(query.currency ? { currency: query.currency } : {}),
                },
              },
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        tx.financialTransaction.findMany({
          where,
          orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          select: {
            id: true,
            transactionNumber: true,
            transactionDate: true,
            transactionType: true,
            status: true,
            reference: true,
            description: true,
            completedAt: true,
            entries: {
              select: {
                id: true,
                fundId: true,
                currency: true,
                entryRole: true,
                direction: true,
                amount: true,
                balanceBefore: true,
                balanceAfter: true,
              },
            },
          },
        }),
        tx.financialTransaction.count({ where }),
      ]);
      return {
        items,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          pageCount: Math.ceil(total / query.pageSize),
        },
      };
    });
  }

  async getTransaction(tenant: TenantContext, transactionId: string) {
    return this.prisma.withTenant(tenant, async (tx) => {
      const transaction = await tx.financialTransaction.findUnique({
        where: {
          organizationId_id: {
            organizationId: tenant.organizationId,
            id: transactionId,
          },
        },
        include: {
          entries: true,
          transfer: true,
          conversion: true,
        },
      });
      if (!transaction) {
        throw new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'Financial transaction not found' });
      }
      return transaction;
    });
  }

  async reverseTransaction(
    tenant: TenantContext,
    transactionId: string,
    input: ReverseTransactionDto,
  ) {
    if (!tenant.membershipId) {
      throw new UnauthorizedException({
        code: 'MEMBERSHIP_REQUIRED',
        message: 'An active organization membership is required for financial mutations',
      });
    }
    const membershipId = tenant.membershipId;
    return this.prisma.withTenant(tenant, async (tx) => {
      const original = await tx.financialTransaction.findUnique({
        where: { organizationId_id: { organizationId: tenant.organizationId, id: transactionId } },
        include: { entries: true, reversals: { select: { id: true } } },
      });
      if (!original) {
        throw new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'Financial transaction not found' });
      }
      if (original.status !== 'COMPLETED') {
        throw new ConflictException({ code: 'TRANSACTION_NOT_REVERSIBLE', message: 'Only completed transactions can be reversed' });
      }
      if (original.reversals.length > 0) {
        throw new ConflictException({ code: 'TRANSACTION_ALREADY_REVERSED', message: 'Transaction has already been reversed' });
      }

      const fundIds = original.entries
        .filter((entry) => entry.entryRole === 'FUND' && entry.fundId)
        .map((entry) => entry.fundId as string)
        .sort();
      for (const fundId of fundIds) {
        await this.lockFund(tx, tenant.organizationId, fundId);
      }
      const funds = new Map(
        (await tx.fund.findMany({
          where: { organizationId: tenant.organizationId, id: { in: fundIds } },
        })).map((fund) => [fund.id, fund]),
      );

      const reversal = await tx.financialTransaction.create({
        data: {
          organizationId: tenant.organizationId,
          transactionNumber: input.transactionNumber.trim(),
          transactionDate: new Date(input.transactionDate),
          transactionType: 'REVERSAL',
          status: 'COMPLETED',
          reference: `REVERSAL_OF:${original.transactionNumber}`,
          description: input.reason?.trim() ?? `Reversal of ${original.transactionNumber}`,
          createdById: membershipId,
          approvedById: membershipId,
          completedAt: new Date(),
          reversalOfTransactionId: original.id,
        },
      });

      const entries: Prisma.LedgerEntryCreateManyInput[] = [];
      for (const originalEntry of original.entries) {
        const direction = originalEntry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT';
        let balanceBefore: Prisma.Decimal | null = null;
        let balanceAfter: Prisma.Decimal | null = null;
        if (originalEntry.entryRole === 'FUND' && originalEntry.fundId) {
          const fund = funds.get(originalEntry.fundId);
          if (!fund) {
            throw new NotFoundException({ code: 'FUND_NOT_FOUND', message: 'Fund for reversal was not found' });
          }
          balanceBefore = new Prisma.Decimal(fund.currentBalance);
          balanceAfter = calculateBalanceAfter(direction, balanceBefore, originalEntry.amount);
          if (!fund.allowOverdraft && balanceAfter.isNegative()) {
            throw new ConflictException({
              code: 'INSUFFICIENT_FUNDS_FOR_REVERSAL',
              message: 'Reversal would create a negative fund balance',
              fundId: fund.id,
              available: balanceBefore.toString(),
              requested: originalEntry.amount.toString(),
              currency: fund.currency,
            });
          }
          funds.set(fund.id, { ...fund, currentBalance: balanceAfter });
          await tx.fund.update({
            where: { organizationId_id: { organizationId: tenant.organizationId, id: fund.id } },
            data: { currentBalance: balanceAfter, version: { increment: 1 } },
          });
        }
        entries.push({
          organizationId: tenant.organizationId,
          transactionId: reversal.id,
          fundId: originalEntry.fundId,
          currency: originalEntry.currency,
          entryRole: originalEntry.entryRole,
          direction,
          amount: originalEntry.amount,
          balanceBefore,
          balanceAfter,
          counterpartyCode: originalEntry.counterpartyCode,
          categoryId: originalEntry.categoryId,
          projectId: originalEntry.projectId,
        });
      }
      await tx.ledgerEntry.createMany({ data: entries });
      await tx.financialTransaction.update({
        where: { organizationId_id: { organizationId: tenant.organizationId, id: original.id } },
        data: { status: 'REVERSED' },
      });
      await this.writeEvidence(tx, tenant, reversal.id, 'REVERSAL', {
        transactionNumber: reversal.transactionNumber,
        reversalOfTransactionId: original.id,
        originalTransactionNumber: original.transactionNumber,
        reason: input.reason ?? '',
      });
      return reversal;
    });
  }

  async listBudgets(tenant: TenantContext) {
    return this.prisma.withTenant(tenant, async (tx) => {
      const budgets = await tx.budget.findMany({
        where: { organizationId: tenant.organizationId },
        orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
      });
      return Promise.all(budgets.map(async (budget) => this.withBudgetTotals(tx, budget)));
    });
  }

  async createBudget(tenant: TenantContext, input: CreateBudgetDto) {
    if (!tenant.membershipId) {
      throw new UnauthorizedException({
        code: 'MEMBERSHIP_REQUIRED',
        message: 'An active organization membership is required for financial mutations',
      });
    }
    const budgetAmount = this.positiveDecimal(input.budgetAmount, 'budgetAmount');
    const currency = input.currency.toUpperCase();
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (startDate > endDate) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'Budget start date must not be after end date' });
    }

    return this.prisma.withTenant(tenant, async (tx) => {
      if (input.fundId) {
        const fund = await tx.fund.findUnique({ where: { organizationId_id: { organizationId: tenant.organizationId, id: input.fundId } } });
        if (!fund) {
          throw new NotFoundException({ code: 'FUND_NOT_FOUND', message: 'Fund not found' });
        }
        if (fund.currency.trim() !== currency) {
          throw new BadRequestException({ code: 'CURRENCY_MISMATCH', message: 'Budget currency must match the fund currency' });
        }
      }
      const budget = await tx.budget.create({
        data: {
          organizationId: tenant.organizationId,
          createdById: tenant.membershipId!,
          name: input.name.trim(),
          budgetAmount,
          currency,
          startDate,
          endDate,
          categoryId: input.categoryId,
          fundId: input.fundId,
          projectId: input.projectId,
          status: input.status ?? 'draft',
        },
      });
      await this.writeEvidence(tx, tenant, budget.id, 'BUDGET', {
        name: budget.name,
        budgetAmount: budgetAmount.toString(),
        currency,
      });
      return this.withBudgetTotals(tx, budget);
    });
  }

  private async withBudgetTotals(
    tx: Prisma.TransactionClient,
    budget: Prisma.BudgetGetPayload<{}>,
  ) {
    const spent = await tx.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: {
        organizationId: budget.organizationId,
        entryRole: 'FUND',
        direction: 'DEBIT',
        currency: budget.currency,
        ...(budget.fundId ? { fundId: budget.fundId } : {}),
        ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
        ...(budget.projectId ? { projectId: budget.projectId } : {}),
        transaction: {
          status: 'COMPLETED',
          transactionDate: { gte: budget.startDate, lte: budget.endDate },
        },
      },
    });
    const spentAmount = new Prisma.Decimal(spent._sum.amount ?? 0);
    const remainingAmount = new Prisma.Decimal(budget.budgetAmount).sub(spentAmount);
    const percentageUsed = new Prisma.Decimal(budget.budgetAmount).isZero()
      ? new Prisma.Decimal(0)
      : spentAmount.div(budget.budgetAmount).mul(100);
    return { ...budget, spentAmount, remainingAmount, percentageUsed };
  }

  async postExpense(tenant: TenantContext, input: SingleFundInput) {
    return this.postSingleFund(tenant, 'EXPENSE', input);
  }

  async postTransfer(tenant: TenantContext, input: TransferInput) {
    return this.postLinkedFunds(tenant, 'FUND_TRANSFER', input);
  }

  async postConversion(tenant: TenantContext, input: ConversionInput) {
    const result = await this.postLinkedFunds(tenant, 'CURRENCY_CONVERSION', input);
    return result;
  }

  private async postLinkedFunds(
    tenant: TenantContext,
    transactionType: 'FUND_TRANSFER' | 'CURRENCY_CONVERSION',
    input: TransferInput,
  ) {
    if (!tenant.membershipId) {
      throw new UnauthorizedException({
        code: 'MEMBERSHIP_REQUIRED',
        message: 'An active organization membership is required for financial mutations',
      });
    }
    const membershipId = tenant.membershipId;
    if (input.sourceFundId === input.destinationFundId) {
      throw new BadRequestException({ code: 'INVALID_TRANSFER', message: 'Source and destination funds must differ' });
    }

    const sourceAmount = this.positiveDecimal(input.sourceAmount, 'sourceAmount');
    const destinationAmount = this.positiveDecimal(input.destinationAmount, 'destinationAmount');
    const fee = input.fee ? this.nonNegativeDecimal(input.fee, 'fee') : new Prisma.Decimal(0);
    const sourceCurrency = input.sourceCurrency.trim().toUpperCase();
    const destinationCurrency = input.destinationCurrency.trim().toUpperCase();
    const exchangeRate = input.exchangeRate
      ? this.positiveDecimal(input.exchangeRate, 'exchangeRate')
      : new Prisma.Decimal(1);

    if (transactionType === 'CURRENCY_CONVERSION' && sourceCurrency === destinationCurrency) {
      throw new BadRequestException({ code: 'INVALID_CONVERSION', message: 'Conversion currencies must differ' });
    }
    if (sourceCurrency !== destinationCurrency && !input.exchangeRate) {
      throw new BadRequestException({ code: 'EXCHANGE_RATE_REQUIRED', message: 'An exchange rate is required for cross-currency transfers' });
    }
    const expectedDestination = calculateDestinationAmount(sourceAmount, exchangeRate);
    if (!expectedDestination.eq(destinationAmount)) {
      throw new BadRequestException({
        code: 'CONVERSION_AMOUNT_MISMATCH',
        message: 'Destination amount must equal source amount multiplied by the exchange rate',
        expected: expectedDestination.toString(),
        received: destinationAmount.toString(),
      });
    }

    return this.prisma.withTenant(tenant, async (tx) => {
      const fundIds = [input.sourceFundId, input.destinationFundId].sort();
      for (const fundId of fundIds) {
        await this.lockFund(tx, tenant.organizationId, fundId);
      }
      const [sourceFund, destinationFund] = await Promise.all([
        tx.fund.findUnique({ where: { organizationId_id: { organizationId: tenant.organizationId, id: input.sourceFundId } } }),
        tx.fund.findUnique({ where: { organizationId_id: { organizationId: tenant.organizationId, id: input.destinationFundId } } }),
      ]);
      if (!sourceFund || !destinationFund || sourceFund.status !== 'active' || destinationFund.status !== 'active') {
        throw new NotFoundException({ code: 'FUND_NOT_FOUND', message: 'Source or destination fund not found' });
      }
      if (sourceFund.currency.trim() !== sourceCurrency || destinationFund.currency.trim() !== destinationCurrency) {
        throw new BadRequestException({ code: 'CURRENCY_MISMATCH', message: 'Transfer currencies must match their funds' });
      }

      const sourceTotal = sourceAmount.add(fee);
      const sourceBefore = new Prisma.Decimal(sourceFund.currentBalance);
      const destinationBefore = new Prisma.Decimal(destinationFund.currentBalance);
      const sourceAfter = calculateBalanceAfter('DEBIT', sourceBefore, sourceTotal);
      const destinationAfter = calculateBalanceAfter('CREDIT', destinationBefore, destinationAmount);
      if (!sourceFund.allowOverdraft && sourceAfter.isNegative()) {
        throw new ConflictException({
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds.',
          available: sourceBefore.toString(),
          requested: sourceTotal.toString(),
          shortfall: sourceTotal.sub(sourceBefore).toString(),
          currency: sourceCurrency,
        });
      }

      const transaction = await tx.financialTransaction.create({
        data: {
          organizationId: tenant.organizationId,
          transactionNumber: input.transactionNumber.trim(),
          transactionDate: input.transactionDate,
          transactionType,
          status: 'COMPLETED',
          reference: input.reference?.trim(),
          description: input.description?.trim(),
          createdById: membershipId,
          approvedById: membershipId,
          completedAt: new Date(),
        },
      });
      const entries: Prisma.LedgerEntryCreateManyInput[] = [
        {
          organizationId: tenant.organizationId,
          transactionId: transaction.id,
          fundId: input.sourceFundId,
          currency: sourceCurrency,
          entryRole: 'FUND',
          direction: 'DEBIT',
          amount: sourceTotal,
          balanceBefore: sourceBefore,
          balanceAfter: sourceAfter,
        },
        {
          organizationId: tenant.organizationId,
          transactionId: transaction.id,
          fundId: input.destinationFundId,
          currency: destinationCurrency,
          entryRole: 'FUND',
          direction: 'CREDIT',
          amount: destinationAmount,
          balanceBefore: destinationBefore,
          balanceAfter: destinationAfter,
        },
      ];
      if (!fee.isZero()) {
        entries.push({
          organizationId: tenant.organizationId,
          transactionId: transaction.id,
          fundId: null,
          currency: sourceCurrency,
          entryRole: 'OFFSET',
          direction: 'CREDIT',
          amount: fee,
          balanceBefore: null,
          balanceAfter: null,
          counterpartyCode: 'BANK_FEES',
        });
      }
      await tx.ledgerEntry.createMany({ data: entries });
      await tx.fund.update({ where: { organizationId_id: { organizationId: tenant.organizationId, id: input.sourceFundId } }, data: { currentBalance: sourceAfter, version: { increment: 1 } } });
      await tx.fund.update({ where: { organizationId_id: { organizationId: tenant.organizationId, id: input.destinationFundId } }, data: { currentBalance: destinationAfter, version: { increment: 1 } } });

      if (transactionType === 'FUND_TRANSFER') {
        await tx.fundTransfer.create({
          data: {
            organizationId: tenant.organizationId,
            transactionId: transaction.id,
            sourceFundId: input.sourceFundId,
            destinationFundId: input.destinationFundId,
            sourceCurrency,
            destinationCurrency,
            sourceAmount,
            destinationAmount,
            exchangeRate,
            fee,
            status: 'COMPLETED',
            createdById: membershipId,
          },
        });
      } else {
        await tx.currencyConversion.create({
          data: {
            organizationId: tenant.organizationId,
            transactionId: transaction.id,
            sourceFundId: input.sourceFundId,
            destinationFundId: input.destinationFundId,
            conversionDate: (input as ConversionInput).conversionDate,
            sourceCurrency,
            destinationCurrency,
            sourceAmount,
            exchangeRate,
            destinationAmount,
            conversionFee: fee,
            totalSourceCost: sourceTotal,
            status: 'COMPLETED',
            createdById: membershipId,
          },
        });
      }
      await this.writeEvidence(tx, tenant, transaction.id, transactionType, {
        transactionNumber: transaction.transactionNumber,
        sourceFundId: input.sourceFundId,
        destinationFundId: input.destinationFundId,
        sourceAmount: sourceAmount.toString(),
        destinationAmount: destinationAmount.toString(),
        exchangeRate: exchangeRate.toString(),
        fee: fee.toString(),
      });
      return transaction;
    });
  }

  private async postSingleFund(
    tenant: TenantContext,
    transactionType: SingleFundType,
    input: SingleFundInput,
  ) {
    if (!tenant.membershipId) {
      throw new UnauthorizedException({
        code: 'MEMBERSHIP_REQUIRED',
        message: 'An active organization membership is required for financial mutations',
      });
    }
    const membershipId = tenant.membershipId;
    const amount = this.positiveDecimal(input.amount, 'amount');
    const currency = input.currency.trim().toUpperCase();

    try {
      return await this.prisma.withTenant(tenant, async (tx) => {
        await this.lockFund(tx, tenant.organizationId, input.fundId);
        const fund = await tx.fund.findUnique({
          where: {
            organizationId_id: {
              organizationId: tenant.organizationId,
              id: input.fundId,
            },
          },
        });
        if (!fund || fund.status !== 'active') {
          throw new NotFoundException({ code: 'FUND_NOT_FOUND', message: 'Fund not found' });
        }
        if (fund.currency.trim() !== currency) {
          throw new BadRequestException({
            code: 'CURRENCY_MISMATCH',
            message: 'Transaction currency must match the fund currency',
          });
        }

        const balanceBefore = new Prisma.Decimal(fund.currentBalance);
        const balanceAfter = calculateBalanceAfter(
          transactionType === 'INCOME' ? 'CREDIT' : 'DEBIT',
          balanceBefore,
          amount,
        );
        if (transactionType === 'EXPENSE' && !fund.allowOverdraft && balanceAfter.isNegative()) {
          throw new ConflictException({
            code: 'INSUFFICIENT_FUNDS',
            message: 'Insufficient funds.',
            available: balanceBefore.toString(),
            requested: amount.toString(),
            shortfall: amount.sub(balanceBefore).toString(),
            currency,
          });
        }

        const direction = transactionType === 'INCOME' ? 'CREDIT' : 'DEBIT';
        const offsetDirection = direction === 'CREDIT' ? 'DEBIT' : 'CREDIT';
        const transaction = await tx.financialTransaction.create({
          data: {
            organizationId: tenant.organizationId,
            transactionNumber: input.transactionNumber.trim(),
            transactionDate: input.transactionDate,
            transactionType,
            status: 'COMPLETED',
            reference: input.reference?.trim(),
            description: input.description?.trim(),
            projectId: input.projectId,
            categoryId: input.categoryId,
            createdById: membershipId,
            approvedById: membershipId,
            completedAt: new Date(),
          },
        });

        await tx.ledgerEntry.createMany({
          data: [
            {
              organizationId: tenant.organizationId,
              transactionId: transaction.id,
              fundId: input.fundId,
              currency,
              entryRole: 'FUND',
              direction,
              amount,
              balanceBefore,
              balanceAfter,
              categoryId: input.categoryId,
              projectId: input.projectId,
            },
            {
              organizationId: tenant.organizationId,
              transactionId: transaction.id,
              fundId: null,
              currency,
              entryRole: 'OFFSET',
              direction: offsetDirection,
              amount,
              balanceBefore: null,
              balanceAfter: null,
              categoryId: input.categoryId,
              projectId: input.projectId,
              counterpartyCode: input.counterpartyCode ?? transactionType,
            },
          ],
        });

        await tx.fund.update({
          where: {
            organizationId_id: {
              organizationId: tenant.organizationId,
              id: input.fundId,
            },
          },
          data: {
            currentBalance: balanceAfter,
            version: { increment: 1 },
          },
        });

        await this.writeEvidence(tx, tenant, transaction.id, transactionType, {
          transactionNumber: transaction.transactionNumber,
          fundId: input.fundId,
          currency,
          amount: amount.toString(),
          direction,
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceAfter.toString(),
        });

        return transaction;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'TRANSACTION_NUMBER_EXISTS',
          message: 'Transaction number already exists',
        });
      }
      throw error;
    }
  }

  private async lockFund(
    tx: Prisma.TransactionClient,
    organizationId: string,
    fundId: string,
  ): Promise<void> {
    await tx.$queryRaw`
      SELECT id
      FROM "pmcs"."funds"
      WHERE organization_id = ${organizationId}::uuid
        AND id = ${fundId}::uuid
      FOR UPDATE
    `;
  }

  private positiveDecimal(value: string, field: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite() || decimal.isNegative() || decimal.isZero()) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: `${field} must be greater than zero`,
      });
    }
    return decimal;
  }

  private nonNegativeDecimal(value: string, field: string): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite() || decimal.isNegative()) {
      throw new BadRequestException({ code: 'INVALID_AMOUNT', message: `${field} must not be negative` });
    }
    return decimal;
  }

  private async writeEvidence(
    tx: Prisma.TransactionClient,
    tenant: TenantContext,
    transactionId: string,
    action: string,
    payload: Record<string, string>,
  ): Promise<void> {
    await tx.auditEvent.create({
      data: {
        organizationId: tenant.organizationId,
        actorMemberId: tenant.membershipId,
        action: `FINANCIAL_${action}_COMPLETED`,
        resourceType: 'FinancialTransaction',
        resourceId: transactionId,
        afterValue: payload,
      },
    });
    await tx.outboxEvent.create({
      data: {
        organizationId: tenant.organizationId,
        eventType: `financial.${action.toLowerCase()}.completed`,
        aggregateType: 'FinancialTransaction',
        aggregateId: transactionId,
        dedupeKey: `financial:${transactionId}:completed`,
        payload,
      },
    });
  }
}
