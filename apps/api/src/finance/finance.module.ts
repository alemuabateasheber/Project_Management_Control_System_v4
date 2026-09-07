import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinancialLedgerService } from './financial-ledger.service';

@Module({
  controllers: [FinanceController],
  providers: [FinancialLedgerService],
  exports: [FinancialLedgerService],
})
export class FinanceModule {}
