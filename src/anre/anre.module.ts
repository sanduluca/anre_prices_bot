import { Module } from '@nestjs/common';
import { AnreService } from './anre.service';
import { AnreController } from './anre.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [AnreController],
  providers: [AnreService],
  exports: [AnreService]
})
export class AnreModule { }
