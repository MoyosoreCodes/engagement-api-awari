import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { redisPubSub } from '../../utils';
import { PostEventType, type PostInteractionEvent } from '../types/post.events';

@Injectable()
export class PostsEventHandler {
  constructor() {}

  @OnEvent(PostEventType.POST_INTERACTION_UPDATED, { async: true })
  async handlePostInteractionUpdated(event: PostInteractionEvent | null) {
    if (!event || !event?.postId) return;

    await redisPubSub.publish(`post_interaction_updated_${event.postId}`, {
      onPostUpdate: {
        postId: event.postId,
        likeCount: event.likeCount,
        dislikeCount: event.dislikeCount,
      },
    });
  }
}
