import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Post } from './schemas.ts/post.schema';
import { PostInteraction } from './schemas.ts/post-interaction.schema';
import { AppEventEmitter } from '../common/events/event-emitter.service';
import {
  InteractionType,
  PostEventType,
  PostInteractionEvent,
} from '../common/events/types/post.events';

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
    const post = await this.postModel.findOne({ _id: id, deletedAt: null });
    if (!post) throw new NotFoundException(`Post with id ${id} not found`);
    return post;
  }

  async getAll() {
    return await this.postModel.find({ deletedAt: null });
  }

  async getPost(postId: string, userId?: string) {
    const post = await this.postModel.findOne({ _id: postId, deletedAt: null });
    if (!post) throw new NotFoundException('Post not found');

    const interactions = await this.interactionModel.find({
      postId,
      deletedAt: null,
    });

    return post.toDto(interactions, userId);
  }

  async createPost(authorId: string, content: string) {
    const post = await this.postModel.create({
      authorId,
      content,
      likeCount: 0,
      dislikeCount: 0,
    });
    return post.toDto();
  }

  async likePost(postId: string, userId: string) {
    await this.toggleInteraction(postId, userId, InteractionType.LIKE);
    return await this.getPost(postId, userId);
  }

  async dislikePost(postId: string, userId: string) {
    await this.toggleInteraction(postId, userId, InteractionType.DISLIKE);
    return await this.getPost(postId, userId);
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
        const post = await this.postModel
          .findOne({ _id: postId, deletedAt: null })
          .session(session);
        if (!post)
          throw new NotFoundException(`Post with id ${postId} not found`);

        const existing = await this.interactionModel
          .findOne({ postId, userId, deletedAt: null })
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
          await this.interactionModel.updateOne(
            { _id: existing._id },
            { deletedAt: new Date() },
            { session },
          );
          likeInc = newType === InteractionType.LIKE ? -1 : 0;
          dislikeInc = newType === InteractionType.DISLIKE ? -1 : 0;
          newState = null;
        } else {
          await this.interactionModel.updateOne(
            { _id: existing._id },
            { type: newType, timestamp: new Date() },
            { session },
          );
          likeInc = newType === InteractionType.LIKE ? 1 : -1;
          dislikeInc = newType === InteractionType.DISLIKE ? 1 : -1;
          newState = newType;
        }

        await this.postModel.updateOne(
          { _id: postId },
          { $inc: { likeCount: likeInc, dislikeCount: dislikeInc } },
          { session },
        );
      });

      const post = await this.postModel.findOne({
        _id: postId,
        deletedAt: null,
      });

      this.eventEmitter.emit(PostEventType.POST_INTERACTION_UPDATED, {
        postId,
        userId,
        previousState,
        newState,
        likeCount: post?.likeCount ?? 0,
        dislikeCount: post?.dislikeCount ?? 0,
      } as PostInteractionEvent);

      return post;
    } finally {
      await session.endSession();
    }
  }

  async deleteAllPosts(): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        await this.postModel.updateMany(
          { deletedAt: null },
          { deletedAt: new Date() },
          { session },
        );
        await this.interactionModel.updateMany(
          { deletedAt: null },
          { deletedAt: new Date() },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
