import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { Post } from '../post/schemas.ts/post.schema';

@Injectable()
export class PostSeeder {
  private readonly logger = new Logger(PostSeeder.name);

  constructor(@InjectModel(Post.name) private postModel: Model<Post>) {}

  async run() {
    const count = await this.postModel.countDocuments();
    if (count > 0) {
      this.logger.log('Posts already seeded, skipping...');
      return;
    }

    const samplePosts = [
      { content: 'First post', authorId: 'user1' },
      { content: 'Second post', authorId: 'user2' },
      { content: 'Third post', authorId: 'user3' },
      { content: 'Fourth post', authorId: 'user4' },
    ];

    await this.postModel.insertMany(samplePosts);
    this.logger.log(`Seeded ${samplePosts.length} posts successfully`);
  }
}
