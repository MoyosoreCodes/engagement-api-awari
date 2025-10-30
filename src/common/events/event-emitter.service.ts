import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppEvent } from './types/';

@Injectable()
export class AppEventEmitter {
  constructor(private eventEmitter: EventEmitter2) {}

  emit<T extends AppEvent>(type: string, payload: T): void {
    this.eventEmitter.emit(type, payload);
  }
}
