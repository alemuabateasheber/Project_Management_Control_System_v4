import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReverseTransactionDto {
  @ApiProperty({ example: 'REV-2026-0001' })
  @IsString()
  @MaxLength(80)
  transactionNumber!: string;

  @ApiProperty({ example: '2026-09-08' })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional({ example: 'Correction of duplicated expense' })
  @IsOptional()
  @IsString()
  reason?: string;
}
