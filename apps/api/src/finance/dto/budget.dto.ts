import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ example: 'Digital Services Delivery 2026' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: '100000.00' })
  @IsString()
  budgetAmount!: string;

  @ApiProperty({ example: 'EUR' })
  @IsIn(['EUR', 'ETB'])
  currency!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fundId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: ['draft', 'approved', 'closed', 'cancelled'] })
  @IsOptional()
  @IsIn(['draft', 'approved', 'closed', 'cancelled'])
  status?: string;
}
