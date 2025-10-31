# Real-Time Engagement Service API

Real-time engagement service for social media posts, built with NestJS, GraphQL Subscriptions, MongoDB, and Redis.

## Project Structure

```
/
├─── src/
│    ├─── auth/              # Authentication and authorization (mock)
│    ├─── common/            # Shared utilities and modules (events, exceptions, middleware, utils, etc.)
│    ├─── config/            # Application configuration (app, database, Redis, etc.)
│    ├─── post/              # Core post feature (GraphQL resolver, service, schema, etc.)
│    └─── main.ts            # Application entry point and server initialization
├─── test/                  # End-to-end (e2e) and integration tests
├─── package.json           # Project dependencies and npm scripts
└─── Dockerfile             # Docker configuration for building a production image
```

## Setup & Execution

### Prerequisites
- Node.js v20+
- Docker 
- Docker Compose 
- Git

### Local Run Command
1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd engagement-service
    ```
2.  **Create Environment File:**
    Create a `.env` file in the root of the project and add the required environment variables (see the "Environment Variables" section).
3.  **Start all services:**
    ```bash
    docker-compose up -d --build
    ```
    This single command builds the images and starts the NestJS API, MongoDB, and Redis containers.

### API Endpoint
- **GraphQL Playground**: `http://localhost:3000/graphql`

---

## Design Decisions

### Data Model
The data is structured into two main collections: `Post` and `PostInteraction`.


**`Post` Collection**
Stores the core content and aggregated counts of interactions.
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

**`PostInteraction` Collection**
Tracks individual user interactions (likes/dislikes) for each post. This reference table allows to adjust for additional post interactions e.g comments, upvotes, reposts, views. The `InteractionType` enum is defined in `src/common/events/types/post.events.ts`.
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

**Justification: Referencing vs. Embedding**

A **referencing** approach was chosen over embedding interactions within the `Post` document. In this model, the `PostInteraction` collection stores a reference to the `Post` (`postId`).

-   **Scalability**: If a post becomes very popular, embedding thousands or millions of likes/dislikes into a single post document would lead to a large document size, potentially hitting MongoDB's 16MB document limit and causing performance issues. Furthermore, fetching a single post would retrieve all its embedded interactions, significantly bloating the response size and increasing network latency and memory usage on the client.
-   **Flexibility**: A separate collection makes it easier to query and analyze user interactions independently of the post content. For example, we could easily build features like "posts you've liked" or perform analytics on interaction patterns.
-   **Performance**: While embedding can be faster for read operations that need all data at once, write operations (liking/unliking) are more efficient with referencing, as they only involve updating a small, separate `PostInteraction` document and incrementing a counter on the `Post` document.

### Real-Time Flow
When a user executes a mutation like `likePost`, the following sequence of events occurs to deliver a real-time update:

1.  **Database Transaction**: The `PostService`'s `toggleInteraction` method starts a MongoDB session and updates the `PostInteraction` and `Post` collections within a single transaction. This ensures data consistency.
2.  **Local Event Emission**: After the database transaction successfully commits, the `PostService` uses the `AppEventEmitter` to emit a local event of type `post.interaction.updated`. This decouples the core business logic from the real-time notification system and allows for additional business logic to be triggered when a post is updated.
3.  **Event Handling**: The `PostsEventHandler` listens for the `post.interaction.updated` event using NestJS's `@OnEvent()` decorator.
4.  **Redis Pub/Sub Publish**: The handler's `handlePostInteractionUpdated` method receives the event payload and uses the `redisPubSub` utility to publish the updated data to a specific Redis channel (e.g., `post_updated_YOUR_POST_ID`).
5.  **Subscription Broadcast**: The GraphQL subscription manager (which is subscribed to the Redis channel) receives the message and broadcasts the payload to all connected clients who are subscribed to that specific post via the `onPostUpdate` subscription.

### Security/Auth Mock
For this assessment, authentication is mocked by retrieving the user's ID from the `x-user-id` HTTP header.
- The `AuthGuard` checks for the presence of the `x-user-id` header in incoming requests (both HTTP and WebSocket connection params).
- The `@CurrentUser()` decorator extracts the value of this header and makes it available to the resolvers, allowing the application to identify the user performing an action without implementing a full authentication system.

---

## Testing & Verification

### Initial Setup: Seeding Data
Use the following queries to create and view posts.

**Test Case 1: Create a Post**
```graphql
mutation {
  createPost(content: $content) {
    id
    content
    authorId
    likeCount
    dislikeCount
  }
}
```

**Variables:**
```json
{
  "content": "This is the first post!"
}
```

**Headers:**
```json
{
  "x-user-id": "user1"
}
```

**Test Case 2: List All Posts**
This query retrieves all posts. You can use it to get the `id` of the post you want to use in the next test cases.
```graphql
query {
  getAll {
    id
    content
    authorId
    likeCount
    dislikeCount
  }
}
```

### Interaction & Real-Time Tests

**Test Case 3 (Mutation): Like a Post**
To like a post, execute the following GraphQL mutation. You must provide a valid `postId` and include the `x-user-id` in the request headers.

**Query:**
```graphql
mutation {
  likePost(postId: $postId) {
    id
    content
    likeCount
    dislikeCount
    currentUserInteraction
  }
}
```

**Variables:**
```json
{
  "postId": "YOUR_POST_ID"
}
```

**Headers:**
```json
{
  "x-user-id": "user2"
}
```

**Test Case 4 (Subscription): Subscribe to Post Updates**
To subscribe to real-time updates for a post, execute the following GraphQL subscription query.

**Query:**
```graphql
subscription {
  onPostUpdate(postId: $postId) {
    id
    likeCount
    dislikeCount
  }
}
```

**Variables:**
```json
{
  "postId": "YOUR_POST_ID"
}
```

### Test Scenario Instructions
1.  Use **Test Case 1** to create a new post. Note the `id` from the response.
2.  **Open two browser tabs/GraphQL clients** and navigate to `http://localhost:3000/graphql`.
3.  **In Tab 1**, execute the **Subscription** query from **Test Case 4** using the `postId` from step 1.
4.  **In Tab 2**, execute the **Mutation** from **Test Case 3** using the same `postId`. Remember to include a different `x-user-id` header.
5.  **Observe the instant update in Tab 1**. The subscription will immediately push the updated `likeCount` to the client.

---

## Environment Variables

Create a `.env` file in the root of the project with the following variables:

```env
# app
PORT=3000
NODE_ENV=development

# database
MONGODB_URI=mongodb://db:27017/engagement-api?replicaSet=rs0

# redis
REDIS_HOST=redis
REDIS_PORT=6379
```

---