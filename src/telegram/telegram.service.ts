import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, TelegramError } from 'telegraf';
import { message } from 'telegraf/filters';
import * as fs from 'fs';
import * as dayjs from 'dayjs';
import { AnreService } from 'src/anre/anre.service';
import { Cron } from '@nestjs/schedule';
import { FmtString } from 'telegraf/typings/format';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;
  private readonly logger = new Logger(TelegramService.name);
  private readonly scheduledChatsFile = 'scheduled_chats.txt';
  private readonly sessionsFile = 'sessions.txt';
  private scheduledChats: number[] = [];
  private sessions: number[] = [];
  private readonly daysToShow = 7;

  constructor(
    private configService: ConfigService,
    private anreService: AnreService,
  ) {
    const token = this.configService.get('TOKEN');
    if (!token) {
      throw new Error('Telegram bot token not provided in .env file');
    }

    this.bot = new Telegraf(token);
    this.scheduledChats = this.loadChats(this.scheduledChatsFile);
    this.sessions = this.loadChats(this.sessionsFile);
  }

  onModuleInit() {
    this.initBotCommands();
    this.bot.launch();
    this.logger.log('Telegram Bot is running!');
  }

  private initBotCommands() {
    const labels = {
      PETROL: '⛽️ Petrol Price',
      PETROL_TABLE: '📊 Petrol Table',
      DIESEL: '⛽ Diesel Price',
      DIESEL_TABLE: '📊 Diesel Table',
      REMIND_DAILY: '⏰ Remind me daily',
      REMOVE_REMINDER: '❌ Dont remind me anymore',
      CONTACT_DEVELOPER: '👨🏻‍💻 Contact the developer',
    };

    this.bot.on(message('text'), (ctx) => {
      const msg = ctx.message;
      const chatId = msg.chat.id;

      switch (msg.text) {
        case '/start':
          this.sessions.push(chatId);
          this.saveChats(this.sessionsFile, this.sessions);
          this.sendMessage(chatId, 'Welcome! Choose an action:', {
            reply_markup: {
              keyboard: this.getKeyboard(false),
              resize_keyboard: true,
            },
          });
          break;

        case labels.PETROL:
          this.sendPetrolPrice(chatId);
          break;

        case labels.PETROL_TABLE:
          this.sendPetrolPriceTable(chatId);
          break;

        case labels.DIESEL:
          this.sendDieselPrice(chatId);
          break;

        case labels.DIESEL_TABLE:
          this.sendDieselPriceTable(chatId);
          break;

        case labels.REMIND_DAILY:
          this.scheduledChats.push(chatId);
          this.saveChats(this.scheduledChatsFile, this.scheduledChats);
          this.sendMessage(chatId, 'You will now receive daily updates!', {
            reply_markup: {
              keyboard: this.getKeyboard(true),
              resize_keyboard: true,
            },
          });
          break;

        case labels.REMOVE_REMINDER:
          this.removeReminderForChat(chatId);
          this.sendMessage(chatId, 'Daily reminders disabled.', {
            reply_markup: {
              keyboard: this.getKeyboard(false),
              resize_keyboard: true,
            },
          });
          break;

        case labels.CONTACT_DEVELOPER:
          this.sendMessage(
            chatId,
            '<b>Developer:</b> Sandu Luca\n<a href="https://www.linkedin.com/in/sandu-luca-372439184/">LinkedIn</a>\n<a href="https://github.com/sanduluca">GitHub</a>\n<a href="mailto:sandulucawork@gmail.com">Email: sandulucawork@gmail.com</a>',
            {
              parse_mode: 'HTML',
            },
          );
          break;

        default:
          this.sendMessage(
            chatId,
            'Unknown command. Please use the keyboard actions.',
          );
      }
    });
  }

  private removeReminderForChat(chatId: number | string) {
    this.scheduledChats = this.scheduledChats.filter((id) => id !== chatId);
    this.saveChats(this.scheduledChatsFile, this.scheduledChats);
  }

  private sendMessage(
    chatId: number | string,
    text: string | FmtString,
    extra?: ExtraReplyMessage,
  ) {
    return this.bot.telegram.sendMessage(chatId, text, extra).catch((e) => {
      if (e instanceof TelegramError) {
        if (e.message.includes('chat not found')) {
          this.removeReminderForChat(chatId);
        }
        this.logger.error(
          `Error sending message to chat ${chatId}: ${e.message}`,
        );
      }
    });
  }

  @Cron('0 12 * * *', {
    name: 'notifications',
    timeZone: 'Europe/Chisinau',
  })
  sendFuelPrices() {
    this.logger.log('Sending scheduled updates...');
    this.scheduledChats.forEach((chatId) => {
      this.sendPetrolPrice(chatId);
      this.sendDieselPrice(chatId);
    });
  }

  private getKeyboard(isSubscribed: boolean) {
    const defaultButtons = [
      [{ text: '⛽️ Petrol Price' }, { text: '📊 Petrol Table' }],
      [{ text: '⛽ Diesel Price' }, { text: '📊 Diesel Table' }],
    ];

    const subscriptionButton = isSubscribed
      ? [{ text: '❌ Dont remind me anymore' }]
      : [{ text: '⏰ Remind me daily' }];

    return [
      ...defaultButtons,
      subscriptionButton,
      [{ text: '👨🏻‍💻 Contact the developer' }],
    ];
  }

  private sendPetrolPrice(chatId: number) {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
    this.anreService.getPetrolPrice(yesterday, today).then((data) => {
      const latest = { date: today, price: data.data[0][1] };
      const previous = { price: data.data[1][1] };
      const diff = Number(
        (Number(latest.price) - Number(previous.price)).toFixed(2),
      );
      const emoji = diff < 0 ? '📉' : '📈';
      const parsedDate = dayjs(latest.date).format('DD.MM.YYYY');

      this.sendMessage(
        chatId,
        `${emoji} Petrol: ${parsedDate} ${latest.price} (${diff})`,
      );
    });
  }

  private sendPetrolPriceTable(chatId: number) {
    const from = dayjs().subtract(this.daysToShow, 'day').format('YYYY-MM-DD');
    const to = dayjs().format('YYYY-MM-DD');
    this.anreService.getPetrolPrice(from, to).then((data) => {
      const table = data.data.map(
        (row) => `${dayjs(row[0]).format('DD.MM.YYYY')}\t${row[1]}`,
      );
      this.sendMessage(
        chatId,
        `*Petrol Prices Table*\n\n\`\`\`\n${table.join('\n')}\n\`\`\``,
        { parse_mode: 'MarkdownV2' },
      );
    });
    this.anreService
      .getPetrolPrice(dayjs().subtract(1, 'month').format('YYYY-MM-DD'), to)
      .then((fuelData) => {
        this.anreService.buildPriceChart(fuelData, 'Petrol').then((image) => {
          this.bot.telegram.sendPhoto(chatId, { source: image });
        });
      });
  }

  private sendDieselPrice(chatId: number) {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
    this.anreService.getDieselPrice(yesterday, today).then((data) => {
      const latest = { date: today, price: data.data[0][1] };
      const previous = { price: data.data[1][1] };
      const diff = Number(
        (Number(latest.price) - Number(previous.price)).toFixed(2),
      );
      const emoji = diff < 0 ? '📉' : '📈';
      const parsedDate = dayjs(latest.date).format('DD.MM.YYYY');

      this.sendMessage(
        chatId,
        `${emoji} Diesel: ${parsedDate} ${latest.price} (${diff})`,
      );
    });
  }

  private sendDieselPriceTable(chatId: number) {
    const from = dayjs().subtract(this.daysToShow, 'day').format('YYYY-MM-DD');
    const to = dayjs().format('YYYY-MM-DD');
    this.anreService.getDieselPrice(from, to).then((data) => {
      const table = data.data.map(
        (row) => `${dayjs(row[0]).format('DD.MM.YYYY')}\t${row[1]}`,
      );
      this.sendMessage(
        chatId,
        `*Diesel Prices Table*\n\n\`\`\`\n${table.join('\n')}\n\`\`\``,
        { parse_mode: 'MarkdownV2' },
      );
    });

    this.anreService
      .getDieselPrice(dayjs().subtract(1, 'month').format('YYYY-MM-DD'), to)
      .then((fuelData) => {
        this.anreService.buildPriceChart(fuelData, 'Diesel').then((image) => {
          this.bot.telegram.sendPhoto(chatId, { source: image });
        });
      });
  }

  private loadChats(filePath: string): number[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    return fs
      .readFileSync(filePath, 'utf-8')
      .split('\n')
      .map(Number)
      .filter(Boolean);
  }

  private saveChats(filePath: string, chats: number[]) {
    fs.writeFileSync(filePath, chats.join('\n'), 'utf-8');
  }
}
