import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PostFinancialTransactionDto {
  @ApiProperty({ example: 'INC-2026-0001' })
  @IsString()
  @MaxLength(80)
  transactionNumber!: string;

  @ApiProperty({ example: '2026-09-08' })
  @IsDateString()
  transactionDate!: string;

  @ApiProperty()
  @IsUUID()
  fundId!: string;

  @ApiProperty({ example: 'ETB' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: '100000.00' })
  @IsString()
  amount!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'DONOR' })
  @IsOptional()
  @IsString()
  counterpartyCode?: string;
}

export class PostTransferDto {
  @ApiProperty({ example: 'TRF-2026-0001' })
  @IsString()
  @MaxLength(80)
  transactionNumber!: string;

  @ApiProperty({ example: '2026-09-08' })
  @IsDateString()
  transactionDate!: string;

  @ApiProperty()
  @IsUUID()
  sourceFundId!: string;

  @ApiProperty()
  @IsUUID()
  destinationFundId!: string;

  @ApiProperty({ example: '1000.00' })
  @IsString()
  sourceAmount!: string;

  @ApiProperty({ example: '190000.00' })
  @IsString()
  destinationAmount!: string;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  sourceCurrency!: string;

  @ApiProperty({ example: 'ETB' })
  @IsString()
  destinationCurrency!: string;

  @ApiPropertyOptional({ example: '190' })
  @IsOptional()
  @IsString()
  exchangeRate?: string;

  @ApiPropertyOptional({ example: '10.00' })
  @IsOptional()
  @IsString()
  fee?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class PostConversionDto extends PostTransferDto {
  @ApiProperty({ example: '2026-09-08' })
  @IsDateString()
  conversionDate!: string;
}
