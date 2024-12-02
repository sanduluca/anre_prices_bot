import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import * as cheerio from 'cheerio';

export interface FuelPrice {
    status: string;
    message: string;
    html: string;
    data: [number, number][];
}

// curl 'https://anre.md/oil-get-table?firstDate=2024-11-18&secondDate=2024-12-02&fuelId=2' 
@Injectable()
export class AnreService {
    private readonly baseUrl = 'https://anre.md';
    private readonly fuelUrl = `${this.baseUrl}/oil-get-table`;
    private readonly PETROL_ID = 2;
    private readonly DIESEL_ID = 3;

    constructor(private httpService: HttpService) { }

    getPetrolPrice(from: string, to: string) {
        return this.getFuelPrice(from, to, this.PETROL_ID);
    }

    getDieselPrice(from: string, to: string) {
        return this.getFuelPrice(from, to, this.DIESEL_ID);
    }

    getFuelPrice(from: string, to: string, fuelId: number) {
        return this.httpService.axiosRef.get<FuelPrice>(this.fuelUrl, {
            params: this.buildParams(from, to, fuelId)
        }).then((response) => response.data);
    }

    private buildParams(from: string, to: string, fuelId: number) {
        return {
            firstDate: from,
            secondDate: to,
            fuelId
        };
    }
}
