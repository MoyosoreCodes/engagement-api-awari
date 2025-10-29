import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PostSeeder } from '../post/post.seeder';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(PostSeeder);
  await seeder.run();
  await app.close();
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
