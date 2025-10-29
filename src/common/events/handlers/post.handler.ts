import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { PostInteractionEvent } from '../types/post.events';
import { PubSubService } from '../../../pubsub/pubsub.service';

@Injectable()
export class PostUpdateHandler {
  constructor(private pubSubService: PubSubService) {}

  @OnEvent('post.interaction.changed', { async: true })
  async handlePostInteractionChanged(event: PostInteractionEvent | null) {
    if (!event || !event?.postId) return;

    await this.pubSubService.publish(`post_updated_${event.postId}`, {
      onPostUpdate: {
        postId: event.postId,
        likeCount: event.likeCount,
        dislikeCount: event.dislikeCount,
      },
    });
  }
}
