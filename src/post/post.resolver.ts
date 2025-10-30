import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Subscription,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import {
  PostDto,
  PostUpdateDto,
  PostIdSchema,
  PostContentSchema,
} from './post.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { redisPubSub } from '../common/utils/';
import { PayloadValidationPipe } from '../common/pipes/';

@Resolver(() => PostDto)
export class PostResolver {
  constructor(private postService: PostService) {}

  @Query(() => PostDto)
  @UseGuards(AuthGuard)
  async post(
    @Args('id', { type: () => ID }, new PayloadValidationPipe(PostIdSchema))
    id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postService.getPost(id, user.id);
  }

  @Query(() => PostDto)
  @UseGuards(AuthGuard)
  async getAll(@CurrentUser() user: { id: string }) {
    return this.postService.getAll();
  }

  @Mutation(() => PostDto)
  @UseGuards(AuthGuard)
  async likePost(
    @Args('postId', { type: () => ID }, new PayloadValidationPipe(PostIdSchema))
    postId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postService.likePost(postId, user.id);
  }

  @Mutation(() => PostDto)
  @UseGuards(AuthGuard)
  async dislikePost(
    @Args('postId', { type: () => ID }, new PayloadValidationPipe(PostIdSchema))
    postId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postService.dislikePost(postId, user.id);
  }

  @Mutation(() => PostDto)
  @UseGuards(AuthGuard)
  async createPost(
    @Args('content', new PayloadValidationPipe(PostContentSchema))
    content: string,
    @CurrentUser() user: any,
  ) {
    return this.postService.createPost(user.id, content);
  }

  @Subscription(() => PostUpdateDto, {
    filter: (payload, variables) => {
      return payload.onPostUpdate.postId === variables.postId;
    },
  })
  onPostUpdate(
    @Args('postId', { type: () => ID }, new PayloadValidationPipe(PostIdSchema))
    postId: string,
  ) {
    return redisPubSub.asyncIterator(`post_interaction_updated_${postId}`);
  }
}
