import { Module } from '@nestjs/common';
import { AnreModule } from 'src/anre/anre.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AnreModule],
  providers: [TelegramService],
})
export class TelegramModule {}
