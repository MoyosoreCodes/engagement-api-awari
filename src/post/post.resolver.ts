import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PayloadValidationPipe } from '../common/pipes/';
import { redisPubSub } from '../common/utils/';
import {
  postContentSchema,
  PostDto,
  postIdSchema,
  PostUpdateDto,
} from './post.dto';
import { PostService } from './post.service';

@Resolver(() => PostDto)
export class PostResolver {
  constructor(private postService: PostService) {}

  @Query(() => PostDto)
  @UseGuards(AuthGuard)
  async post(
    @Args('id', { type: () => ID }, new PayloadValidationPipe(postIdSchema))
    id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postService.getPost(id, user.id);
  }

  @Query(() => PostDto)
  @UseGuards(AuthGuard)
  async getAll(@CurrentUser() user: { id: string }) {
    console.log(user);
    return this.postService.getAll();
  }

  @Mutation(() => PostDto)
  @UseGuards(AuthGuard)
  async likePost(
    @Args('postId', { type: () => ID }, new PayloadValidationPipe(postIdSchema))
    postId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postService.likePost(postId, user.id);
  }

  @Mutation(() => PostDto)
  @UseGuards(AuthGuard)
  async dislikePost(
    @Args('postId', { type: () => ID }, new PayloadValidationPipe(postIdSchema))
    postId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postService.dislikePost(postId, user.id);
  }

  @Mutation(() => PostDto)
  @UseGuards(AuthGuard)
  async createPost(
    @Args('content', new PayloadValidationPipe(postContentSchema))
    content: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postService.createPost(user.id, content);
  }

  @Subscription(() => PostUpdateDto, {
    filter: (payload, variables) => {
      return payload.onPostUpdate.postId === variables.postId;
    },
  })
  onPostUpdate(
    @Args('postId', { type: () => ID }, new PayloadValidationPipe(postIdSchema))
    postId: string,
  ) {
    return redisPubSub.asyncIterator(`post_interaction_updated_${postId}`);
  }
}
