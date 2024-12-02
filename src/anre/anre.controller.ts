import { Controller, Get, Query } from '@nestjs/common';
import { AnreService } from './anre.service';
import * as dayjs from 'dayjs';

@Controller('anre')
export class AnreController {
    constructor(private readonly anreService: AnreService) { }

    @Get('petrol-price')
    getPetrolPrice(@Query('from') from: string = dayjs().subtract(8, 'day').format('YYYY-MM-DD'), @Query('to') to: string = dayjs().format('YYYY-MM-DD')) {
        return this.anreService.getPetrolPrice(from, to);
    }

    @Get('diesel-price')
    getDieselPrice(@Query('from') from: string = dayjs().subtract(8, 'day').format('YYYY-MM-DD'), @Query('to') to: string = dayjs().format('YYYY-MM-DD')) {
        return this.anreService.getDieselPrice(from, to);
    }
} 
