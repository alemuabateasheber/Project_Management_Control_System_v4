import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@pmcs.local' })
  @IsString()
  @MinLength(3)
  @MaxLength(320)
  identifier!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @MinLength(12)
  @MaxLength(1024)
  password!: string;

  @ApiPropertyOptional({ description: 'Required when the user belongs to more than one organization.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  organizationSlug?: string;
}
