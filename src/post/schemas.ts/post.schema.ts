import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PostDtoType } from '../post.dto';
import { InteractionType } from './post-interaction.schema';

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  authorId: string;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  dislikeCount: number;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  toDto(
    interactions: { userId: string; type: InteractionType }[] = [],
    userId?: string,
  ): PostDtoType {
    const likeCount = interactions.filter(
      (i) => i.type === InteractionType.LIKE,
    ).length;
    const dislikeCount = interactions.filter(
      (i) => i.type === InteractionType.DISLIKE,
    ).length;

    const userInteraction =
      interactions && userId
        ? (interactions.find((i) => i.userId === userId)?? undefined)
        : undefined;

    return {
      id: this.id.toString(),
      content: this.content,
      authorId: this.authorId,
      likeCount: this.likeCount,
      dislikeCount: this.dislikeCount,
      interactions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      userInteraction,
      deletedAt: this.deletedAt as Date | undefined,
    };
  }
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.methods.toDto = Post.prototype.toDto;
