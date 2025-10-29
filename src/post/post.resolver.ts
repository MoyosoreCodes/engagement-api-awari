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
import { PostDto, PostUpdateDto, PostIdSchema } from './post.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PubSubService } from '../pubsub/pubsub.service';
import { PayloadValidationPipe } from '../common/pipes/';

@Resolver(() => PostDto)
export class PostResolver {
  constructor(
    private postService: PostService,
    private pubSubService: PubSubService,
  ) {}

  @Query(() => PostDto)
  @UseGuards(AuthGuard)
  async post(
    @Args('id', { type: () => ID }, new PayloadValidationPipe(PostIdSchema))
    id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.postService.getPost(id, user.id);
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

  // @Mutation(() => PostDto)
  // @UseGuards(AuthGuard)
  // async createPost(
  //   @Args('content', new PayloadValidationPipe(PostContentSchema))
  //   content: string,
  //   @CurrentUser() user: any,
  // ) {
  //   return this.postService.createPost(content, user.id);
  // }

  @Subscription(() => PostUpdateDto, {
    filter: (payload, variables) => {
      return payload.onPostUpdate.postId === variables.postId;
    },
  })
  onPostUpdate(
    @Args('postId', { type: () => ID }, new PayloadValidationPipe(PostIdSchema))
    postId: string,
  ) {
    return this.pubSubService.asyncIterator(`post_updated_${postId}`);
  }
}
