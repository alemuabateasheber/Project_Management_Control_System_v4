import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class TransactionQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fundId?: string;

  @ApiPropertyOptional({ enum: ['EUR', 'ETB'] })
  @IsOptional()
  @IsIn(['EUR', 'ETB'])
  currency?: string;

  @ApiPropertyOptional({ enum: ['INCOME', 'EXPENSE', 'FUND_TRANSFER', 'CURRENCY_CONVERSION', 'ADJUSTMENT', 'REFUND', 'REVERSAL'] })
  @IsOptional()
  @IsIn(['INCOME', 'EXPENSE', 'FUND_TRANSFER', 'CURRENCY_CONVERSION', 'ADJUSTMENT', 'REFUND', 'REVERSAL'])
  transactionType?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REVERSED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REVERSED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}
