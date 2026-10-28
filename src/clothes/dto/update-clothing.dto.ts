import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ClothingSize } from '../clothing.entity';

export class UpdateClothingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsEnum(ClothingSize)
  size?: ClothingSize;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  material?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;
}
