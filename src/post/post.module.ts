import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostResolver } from './post.resolver';
import { PostService } from './post.service';
import { Post, PostSchema } from './schemas.ts/post.schema';
import {
  PostInteraction,
  PostInteractionSchema,
} from './schemas.ts/post-interaction.schema';
import { AppEventEmitter } from '../common/events/event-emitter.service';
import { PostsEventHandler } from '../common/events/handlers/post.handler';
import { PubSubModule } from '../pubsub/pubsub.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: PostInteraction.name, schema: PostInteractionSchema },
    ]),
    PubSubModule,
  ],
  providers: [PostResolver, PostService, AppEventEmitter, PostsEventHandler],
})
export class PostModule {}