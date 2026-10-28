import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { SlugService } from '../shared/slug.service';
import { ClothingEntity, ClothingSize } from './clothing.entity';
import { CreateClothingDto } from './dto/create-clothing.dto';
import { UpdateClothingDto } from './dto/update-clothing.dto';

@Injectable()
export class ClothesService implements OnModuleInit {
  private readonly logger = new Logger(ClothesService.name);
  private readonly clothes: ClothingEntity[] = [];
  private nextId = 1;

  constructor(private readonly slugService: SlugService) {}

  onModuleInit(): void {
    this.create({ title: 'Футболка Classic', price: 650, size: ClothingSize.M, material: 'Бавовна', color: 'Білий' });
    this.create({ title: 'Худі Urban', price: 1400, size: ClothingSize.L, material: 'Бавовна та поліестер', color: 'Чорний' });
    this.logger.log('Завантажено 2 демонстраційні товари: одяг та взуття.');
  }

  create(dto: CreateClothingDto): ClothingEntity {
    const clothing: ClothingEntity = {
      id: String(this.nextId++),
      title: dto.title,
      slug: this.slugService.generateSlug(dto.title),
      price: dto.price,
      size: dto.size,
      material: dto.material,
      color: dto.color,
    };
    this.clothes.push(clothing);
    return clothing;
  }

  findAll(search?: string, limit?: number): ClothingEntity[] {
    const items = search
      ? this.clothes.filter((item) => item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
      : this.clothes;
    return limit === undefined ? [...items] : items.slice(0, limit);
  }

  findOne(id: string): ClothingEntity {
    const clothing = this.clothes.find((entry) => entry.id === id);
    if (!clothing) throw new NotFoundException(`Товар ${id} не знайдено`);
    return clothing;
  }

  update(id: string, dto: UpdateClothingDto): ClothingEntity {
    const clothing = this.findOne(id);
    // @IsOptional treats null like an omitted value; do not overwrite valid data.
    if (dto.title != null) {
      clothing.title = dto.title;
      clothing.slug = this.slugService.generateSlug(dto.title);
    }
    if (dto.price != null) clothing.price = dto.price;
    if (dto.size != null) clothing.size = dto.size;
    if (dto.material != null) clothing.material = dto.material;
    if (dto.color != null) clothing.color = dto.color;
    return clothing;
  }

  remove(id: string): void {
    this.findOne(id);
    this.clothes.splice(this.clothes.findIndex((item) => item.id === id), 1);
  }
}
