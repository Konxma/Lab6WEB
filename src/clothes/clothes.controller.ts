import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequestIdService } from '../shared/request-id.service';
import { RequestTraceService } from '../shared/request-trace.service';
import { ClothesService } from './clothes.service';
import { ClothingEntity } from './clothing.entity';
import { CreateClothingDto } from './dto/create-clothing.dto';
import { UpdateClothingDto } from './dto/update-clothing.dto';
import { ListClothesQueryDto } from './dto/list-clothes-query.dto';

@Controller('clothes')
export class ClothesController {
  constructor(
    private readonly clothesService: ClothesService,
    private readonly requestId: RequestIdService,
    private readonly requestTrace: RequestTraceService,
  ) {}

  private trace(response: Response): void {
    response.setHeader('X-Request-Id', this.requestId.id);
    response.setHeader('X-Request-Trace-Match', String(this.requestId.id === this.requestTrace.getId()));
  }

  @Get()
  @Header('X-API-Version', '1.0')
  @Header('X-Service-Status', 'operational')
  findAll(
    @Query() query: ListClothesQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): ClothingEntity[] {
    this.trace(response);
    if (query.limit !== undefined) {
      response.setHeader('X-Limit-Type', typeof query.limit);
      response.setHeader('X-Applied-Limit', String(query.limit));
    }
    return this.clothesService.findAll(query.search, query.limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Res({ passthrough: true }) response: Response): ClothingEntity {
    this.trace(response);
    return this.clothesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateClothingDto, @Res({ passthrough: true }) response: Response): ClothingEntity {
    this.trace(response);
    return this.clothesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClothingDto,
    @Res({ passthrough: true }) response: Response,
  ): ClothingEntity {
    this.trace(response);
    return this.clothesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Res({ passthrough: true }) response: Response): void {
    this.trace(response);
    this.clothesService.remove(id);
  }
}
