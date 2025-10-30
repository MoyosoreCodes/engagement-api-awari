import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

import { z } from 'zod';

import { InteractionType } from '../common/events/types/post.events';

export const postIdSchema = z.string().min(24).max(24);

export const postContentSchema = z.string().min(1).max(5000);

export const postInteractionDtoSchema = z.object({
  userId: z.string(),
  type: z.enum(InteractionType),
  timestamp: z.date().optional(),
});

export const postDtoSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
  likeCount: z.number().int().min(0),
  dislikeCount: z.number().int().min(0),
  createdAt: z.date(),
  deletedAt: z.date().optional(),
  updatedAt: z.date(),
  interactions: z.array(postInteractionDtoSchema).optional(),
  userInteraction: z
    .object({
      userId: z.string(),
      type: z.enum(InteractionType),
    })
    .optional(),
});

export const postUpdateDtoSchema = z.object({
  postId: z.string(),
  likeCount: z.number().int().min(0),
  dislikeCount: z.number().int().min(0),
});

export type PostDtoType = z.infer<typeof postDtoSchema>;
export type PostUpdateDtoType = z.infer<typeof postUpdateDtoSchema>;

@ObjectType()
export class InteractionDto {
  @Field()
  userId: string;

  @Field(() => String)
  type: InteractionType;
}

@ObjectType()
export class PostDto {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field()
  authorId: string;

  @Field(() => Int)
  likeCount: number;

  @Field(() => Int)
  dislikeCount: number;

  @Field(() => Boolean)
  currentUserLiked: boolean;

  @Field(() => Boolean)
  currentUserDisliked: boolean;

  @Field(() => [InteractionDto])
  interactions: InteractionDto[];

  @Field(() => InteractionDto, { nullable: true })
  userInteraction?: InteractionDto;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PostUpdateDto {
  @Field(() => ID)
  postId: string;

  @Field(() => Int)
  likeCount: number;

  @Field(() => Int)
  dislikeCount: number;
}
