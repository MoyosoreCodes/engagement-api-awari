import { AppEvent } from '.';

export enum PostEventType {
  post_interaction_updated_ = 'post.interaction.updated',
}

export enum InteractionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export interface PostInteractionEvent extends AppEvent {
  type: PostEventType.post_interaction_updated_;
  postId: string;
  userId: string;
  previousState?: InteractionType | null;
  newState: InteractionType | null;
  likeCount: number;
  dislikeCount: number;
}
