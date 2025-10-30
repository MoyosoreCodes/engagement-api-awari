import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PostEventType, type PostInteractionEvent } from '../types/post.events';
import { redisPubSub } from '../../utils';

@Injectable()
export class PostsEventHandler {
  constructor() {}

  @OnEvent(PostEventType.post_interaction_updated_, { async: true })
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
