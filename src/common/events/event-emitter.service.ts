import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostInteractionEvent } from './types/post.events';

@Injectable()
export class AppEventEmitter {
  constructor(private eventEmitter: EventEmitter2) {}

  emitPostInteractionChanged(event: PostInteractionEvent): void {
    this.eventEmitter.emit('post.interaction.changed', event);
  }
}
