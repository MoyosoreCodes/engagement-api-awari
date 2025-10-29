import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Post } from './schemas.ts/post.schema';
import {
  PostInteraction,
  InteractionType,
} from './schemas.ts/post-interaction.schema';
import { AppEventEmitter } from '../common/events/event-emitter.service';
import { PostInteractionEvent } from '../common/events/types/post.events';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(PostInteraction.name)
    private interactionModel: Model<PostInteraction>,
    @InjectConnection() private connection: Connection,
    private eventEmitter: AppEventEmitter,
  ) {}

  async findById(id: string) {
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException(`Post with id ${id} not found`);
    return post;
  }

  async getPost(postId: string, userId?: string) {
    const post = await this.findById(postId);
    const interactions = await this.interactionModel.find({ postId });
    return post.toDto(interactions, userId);
  }

  async likePost(postId: string, userId: string) {
    await this.toggleInteraction(postId, userId, InteractionType.LIKE);
    return this.getPost(postId, userId);
  }

  async dislikePost(postId: string, userId: string) {
    await this.toggleInteraction(postId, userId, InteractionType.DISLIKE);
    return this.getPost(postId, userId);
  }

  private async toggleInteraction(
    postId: string,
    userId: string,
    newType: InteractionType,
  ) {
    const session = await this.connection.startSession();
    try {
      let previousState: InteractionType | null = null;
      let newState: InteractionType | null = null;

      await session.withTransaction(async () => {
        const post = await this.postModel.findById(postId).session(session);
        if (!post)
          throw new NotFoundException(`Post with ID ${postId} not found`);

        const existing = await this.interactionModel
          .findOne({ postId, userId })
          .session(session);

        previousState = existing?.type ?? null;

        let likeInc = 0;
        let dislikeInc = 0;

        if (!existing) {
          await this.interactionModel.create(
            [{ postId, userId, type: newType, timestamp: new Date() }],
            { session },
          );
          likeInc = newType === InteractionType.LIKE ? 1 : 0;
          dislikeInc = newType === InteractionType.DISLIKE ? 1 : 0;
          newState = newType;
        } else if (existing.type === newType) {
          await this.interactionModel
            .deleteOne({ _id: existing._id })
            .session(session);
          likeInc = newType === InteractionType.LIKE ? -1 : 0;
          dislikeInc = newType === InteractionType.DISLIKE ? -1 : 0;
          newState = null;
        } else {
          await this.interactionModel.updateOne(
            { _id: existing._id },
            { $set: { type: newType, timestamp: new Date() } },
            { session },
          );
          likeInc =
            newType === InteractionType.LIKE
              ? 1
              : previousState === InteractionType.LIKE
                ? -1
                : 0;
          dislikeInc =
            newType === InteractionType.DISLIKE
              ? 1
              : previousState === InteractionType.DISLIKE
                ? -1
                : 0;
          newState = newType;
        }

        await this.postModel.findOneAndUpdate(
          { _id: postId },
          { $inc: { likeCount: likeInc, dislikeCount: dislikeInc } },
          { session },
        );
      });

      (async () => {
        const post = await this.postModel.findById(postId);
        this.eventEmitter.emitPostInteractionChanged({
          postId,
          userId,
          previousState,
          newState,
          likeCount: post?.likeCount ?? 0,
          dislikeCount: post?.dislikeCount ?? 0,
          timestamp: new Date(),
        } as PostInteractionEvent);
      })();
    } finally {
      await session.endSession();
    }
  }

  async deleteAllPosts(): Promise<void> {
    await this.postModel.deleteMany({});
    await this.interactionModel.deleteMany({});
  }
}
