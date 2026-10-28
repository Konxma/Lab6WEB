import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListClothesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  // HTTP query parameters are strings; body prices stay strictly numeric.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
