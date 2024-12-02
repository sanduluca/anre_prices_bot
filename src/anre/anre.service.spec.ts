import { Test, TestingModule } from '@nestjs/testing';
import { AnreService } from './anre.service';

describe('AnreService', () => {
  let service: AnreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnreService],
    }).compile();

    service = module.get<AnreService>(AnreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
