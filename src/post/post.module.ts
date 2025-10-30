import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AppEventEmitter } from '../common/events/event-emitter.service';
import { PostsEventHandler } from '../common/events/handlers/post.handler';
import { PostResolver } from './post.resolver';
import { PostService } from './post.service';
import { Post, PostSchema } from './schemas.ts/post.schema';
import {
  PostInteraction,
  PostInteractionSchema,
} from './schemas.ts/post-interaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: PostInteraction.name, schema: PostInteractionSchema },
    ]),
  ],
  providers: [PostResolver, PostService, AppEventEmitter, PostsEventHandler],
})
export class PostModule {}
