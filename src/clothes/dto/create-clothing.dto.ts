import { IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { ClothingSize } from '../clothing.entity';

export class CreateClothingDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;

  @IsEnum(ClothingSize)
  size!: ClothingSize;

  @IsString()
  @IsNotEmpty()
  material!: string;

  @IsString()
  @IsNotEmpty()
  color!: string;
}
