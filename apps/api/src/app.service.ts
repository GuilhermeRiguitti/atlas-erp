import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: 'Atlas Users API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
