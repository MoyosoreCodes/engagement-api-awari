export enum PostEventType {
  POST_LIKED = 'post.liked',
  POST_UNLIKED = 'post.unliked',
  POST_DISLIKED = 'post.disliked',
  POST_UNDISLIKED = 'post.undisliked',
  POST_INTERACTION_CHANGED = 'post.interaction.changed',
}

export interface PostInteractionEvent {
  postId: string;
  userId: string;
  previousState?: 'LIKE' | 'DISLIKE' | null;
  newState: 'LIKE' | 'DISLIKE' | null;
  likeCount: number;
  dislikeCount: number;
  timestamp: Date;
}
