import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { AnreModule } from 'src/anre/anre.module';

@Module({
  imports: [AnreModule],
  providers: [TelegramService]
})
export class TelegramModule { }
