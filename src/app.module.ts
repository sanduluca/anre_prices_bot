import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './telegram/telegram.module';
import { AnreModule } from './anre/anre.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TelegramModule,
    AnreModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
