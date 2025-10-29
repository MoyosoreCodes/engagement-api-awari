# Real-Time Engagement API

Real-time engagement system for social media posts with NestJS, GraphQL Subscriptions, MongoDB, and Redis.

## Project Structure

```
/
├─── src/
│    ├─── auth/              # Authentication (mock)
│    ├─── common/            # Shared modules (events, exceptions, filters, middleware etc.)
│    ├─── config/            # Application configuration (app, db, redis)
│    ├─── post/              # Core post feature (GraphQL, service, schema)
│    ├─── pubsub/            # Redis Pub/Sub for real-time updates
│    └─── main.ts            # Application entry point
├─── test/                  # End-to-end tests
├─── .env                   # Environment variables
├─── package.json           # Project dependencies
└─── Dockerfile             # Docker configuration
```

## Setup & Execution

### Prerequisites
- Node.js v20+
- pnpm v8+
- Docker v24+
- Docker Compose v2+
- Git v2+

### Running the Application

**1. Clone the repository:**
```bash
git clone <repository-url>
cd engagement-service
```

**2. Start services:**
```bash
# Start MongoDB and Redis
docker-compose up -d

# Install dependencies
pnpm install

# Start the application
pnpm run start:dev
```

### API Endpoints
- GraphQL Playground: http://localhost:3000/graphql
- WebSocket: ws://localhost:3000/graphql

### Stopping Services
```bash
docker-compose down
```

---

## Data Model

**Post Collection:**
```typescript
{
  _id: ObjectId,
  content: string,
  authorId: string,
  likeCount: number,
  dislikeCount: number,
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

**PostInteraction Collection:**
```typescript
{
  _id: ObjectId,
  postId: ObjectId,
  userId: string,
  type: "LIKE" | "DISLIKE",
  timestamp: Date,
  deletedAt: Date | null
}
```

---

## API Reference

### Queries

**`post(id: ID!): PostDto`**
- Fetches a single post by its ID.

**`getAll: [PostDto]`**
- Fetches all posts.

### Mutations

**`createPost(content: String!): PostDto`**
- Creates a new post.

**`likePost(postId: ID!): PostDto`**
- Likes a post.

**`dislikePost(postId: ID!): PostDto`**
- Dislikes a post.

### Subscriptions

**`onPostUpdate(postId: ID!): PostUpdateDto`**
- Subscribes to real-time updates for a specific post.

---

## Environment Variables

Create a `.env` file in the root of the project with the following variables:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=27017
DB_NAME=engagement-api
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## License

MIT