import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum InteractionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

@Schema({ timestamps: true })
export class PostInteraction extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true,
  })
  postId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  type: InteractionType;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const PostInteractionSchema =
  SchemaFactory.createForClass(PostInteraction);

PostInteractionSchema.index({ postId: 1, userId: 1 }, { unique: true });
PostInteractionSchema.index({ userId: 1, postId: 1 });
