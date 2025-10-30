import { AppEvent } from '.';

export enum PostEventType {
  POST_INTERACTION_UPDATED = 'post.interaction.updated',
}

export enum InteractionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export interface PostInteractionEvent extends AppEvent {
  type: PostEventType.POST_INTERACTION_UPDATED;
  postId: string;
  userId: string;
  previousState?: InteractionType | null;
  newState: InteractionType | null;
  likeCount: number;
  dislikeCount: number;
}
