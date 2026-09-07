import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { TenantContext } from '@pmcs/database';
import { TenantContextParam } from '../common/auth/tenant-context.decorator';
import { TenantContextGuard } from '../common/auth/tenant-context.guard';
import { AuthService } from '../auth/auth.service';
import {
  PostConversionDto,
  PostFinancialTransactionDto,
  PostTransferDto,
} from './dto/financial-transaction.dto';
import { FinancialLedgerService } from './financial-ledger.service';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { CreateBudgetDto } from './dto/budget.dto';
import { ReverseTransactionDto } from './dto/reversal.dto';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(TenantContextGuard)
@Controller({ path: 'finance', version: '1' })
export class FinanceController {
  constructor(
    private readonly ledger: FinancialLedgerService,
    private readonly auth: AuthService,
  ) {}

  @Get('funds')
  async funds(@TenantContextParam() tenant: TenantContext): Promise<unknown> {
    await this.auth.assertPermission(tenant, 'fund:read');
    return this.ledger.listFunds(tenant);
  }

  @Get('budgets')
  async budgets(@TenantContextParam() tenant: TenantContext): Promise<unknown> {
    await this.auth.assertPermission(tenant, 'budget:read');
    return this.ledger.listBudgets(tenant);
  }

  @Post('budgets')
  async createBudget(
    @TenantContextParam() tenant: TenantContext,
    @Body() input: CreateBudgetDto,
  ): Promise<unknown> {
    await this.auth.assertPermission(tenant, 'budget:manage');
    return this.ledger.createBudget(tenant, input);
  }

  @Post('transactions/income')
  async income(
    @TenantContextParam() tenant: TenantContext,
    @Body() input: PostFinancialTransactionDto,
  ) {
    await this.auth.assertPermission(tenant, 'transaction:create');
    return this.ledger.postIncome(tenant, {
      ...input,
      transactionDate: new Date(input.transactionDate),
    });
  }

  @Get('transactions')
  async transactions(
    @TenantContextParam() tenant: TenantContext,
    @Query() query: TransactionQueryDto,
  ): Promise<unknown> {
    await this.auth.assertPermission(tenant, 'transaction:read');
    return this.ledger.listTransactions(tenant, query);
  }

  @Get('transactions/:transactionId')
  async transaction(
    @TenantContextParam() tenant: TenantContext,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
  ): Promise<unknown> {
    await this.auth.assertPermission(tenant, 'transaction:read');
    return this.ledger.getTransaction(tenant, transactionId);
  }

  @Post('transactions/expense')
  async expense(
    @TenantContextParam() tenant: TenantContext,
    @Body() input: PostFinancialTransactionDto,
  ) {
    await this.auth.assertPermission(tenant, 'transaction:create');
    return this.ledger.postExpense(tenant, {
      ...input,
      transactionDate: new Date(input.transactionDate),
    });
  }

  @Post('transactions/:transactionId/reverse')
  async reverse(
    @TenantContextParam() tenant: TenantContext,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @Body() input: ReverseTransactionDto,
  ): Promise<unknown> {
    await this.auth.assertPermission(tenant, 'transaction:reverse');
    return this.ledger.reverseTransaction(tenant, transactionId, input);
  }

  @Post('transfers')
  async transfer(@TenantContextParam() tenant: TenantContext, @Body() input: PostTransferDto) {
    await this.auth.assertPermission(tenant, 'transaction:create');
    return this.ledger.postTransfer(tenant, {
      ...input,
      transactionDate: new Date(input.transactionDate),
    });
  }

  @Post('currency-conversions')
  async conversion(@TenantContextParam() tenant: TenantContext, @Body() input: PostConversionDto) {
    await this.auth.assertPermission(tenant, 'transaction:create');
    return this.ledger.postConversion(tenant, {
      ...input,
      transactionDate: new Date(input.transactionDate),
      conversionDate: new Date(input.conversionDate),
    });
  }
}
