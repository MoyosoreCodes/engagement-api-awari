import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { InteractionType } from '../../common/events/types/post.events';

@Schema({ timestamps: true })
export class PostInteraction extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true,
  })
  postId: string;

  @Prop({
    required: true,
    index: true,
  })
  userId: string;

  @Prop({ required: true, enum: InteractionType })
  type: InteractionType;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

export const PostInteractionSchema =
  SchemaFactory.createForClass(PostInteraction);

PostInteractionSchema.index(
  { postId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);
PostInteractionSchema.index({ userId: 1, postId: 1 });
