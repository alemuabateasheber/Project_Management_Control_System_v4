import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'PMCS-001' })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Digital Transformation Program' })
  @IsString()
  @MaxLength(300)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['proposed', 'planning', 'approved', 'active', 'on_hold', 'at_risk', 'completed', 'cancelled', 'archived'] })
  @IsOptional()
  @IsIn(['proposed', 'planning', 'approved', 'active', 'on_hold', 'at_risk', 'completed', 'cancelled', 'archived'])
  lifecycleStatus?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerMembershipId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedFinishDate?: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
