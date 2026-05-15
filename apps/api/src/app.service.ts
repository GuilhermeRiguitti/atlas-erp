import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: 'ERP Fiscal API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
