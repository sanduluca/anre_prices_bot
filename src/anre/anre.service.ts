import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ChartConfiguration, ChartData } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as dayjs from 'dayjs';

export interface FuelData {
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

  constructor(private httpService: HttpService) {}

  getPetrolPrice(from: string, to: string) {
    return this.getFuelPrice(from, to, this.PETROL_ID);
  }

  getDieselPrice(from: string, to: string) {
    return this.getFuelPrice(from, to, this.DIESEL_ID);
  }

  getFuelPrice(from: string, to: string, fuelId: number) {
    return this.httpService.axiosRef
      .get<FuelData>(this.fuelUrl, {
        params: this.buildParams(from, to, fuelId),
      })
      .then((response) => response.data);
  }

  private buildParams(from: string, to: string, fuelId: number) {
    return {
      firstDate: from,
      secondDate: to,
      fuelId,
    };
  }

  buildPriceChart(fuelData: FuelData, label: string) {
    const dates = fuelData.data
      .map((item) => dayjs(item[0]).format('DD/MM/YYYY'))
      .reverse();
    const fuelPrices = fuelData.data.map((item) => item[1]).reverse();

    const width = 800;
    const height = 400;
    const backgroundColour = 'white';
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour,
    });

    const data: ChartData<'line'> = {
      labels: dates,
      datasets: [
        {
          label,
          data: fuelPrices,
          borderColor: '#A1C6EA',
          backgroundColor: '#507DBC',
        },
      ],
    };
    const configuration: ChartConfiguration = {
      type: 'line',
      data: data,
      options: {
        scales: {
          y: {
            ticks: {
              stepSize: 0.01,
            },
          },
        },
      },
    };
    return chartJSNodeCanvas.renderToBuffer(configuration);
  }
}
