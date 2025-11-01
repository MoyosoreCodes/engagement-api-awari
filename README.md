# Awari Backend Assessment Submission 

Real-time engagement service for social media posts, built with NestJS, GraphQL Subscriptions, MongoDB, and Redis.

---

## 🚀 Setup & Execution

#### Prerequisites

- Node.js v20+
- pnpm
- Docker & Docker Compose
- Git

_This project uses **pnpm** for package management. If you don't have it, install it globally by running: `npm install -g pnpm`_

#### Environment Variables

Create a `.env` file in the root of the project. The default values below are configured to work with the `docker-compose` setup.

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

#### Local Run Command

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd engagement-service
    ```
2.  **Start all services:**
    ```bash
    docker-compose up -d --build
    ```
    This single command builds the images and starts the NestJS API, MongoDB, and Redis containers.

#### API Endpoint

- **GraphQL Playground**: `http://localhost:3000/graphql`

---

## ንድ Design Decisions

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
Tracks individual user interactions (likes/dislikes) for each post.

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

A **referencing** approach was chosen over embedding interactions within the `Post` document for three main reasons:

- **Scalability**: Avoids hitting MongoDB's 16MB document size limit on popular posts.
- **Flexibility**: Allows for easier querying of user interactions independently of post content (e.g., building a "posts you've liked" feature).
- **Write Performance**: Liking/unliking a post only requires a small update to the `PostInteraction` collection and an atomic increment on the `Post`, which is more efficient at scale.

### Real-Time Flow

When a user executes a mutation like `likePost`, the following sequence of events occurs:

1.  **Database Transaction**: The `PostService` starts a MongoDB session and updates the `PostInteraction` and `Post` collections within a single transaction.
2.  **Local Event Emission**: After the transaction commits, the `PostService` emits a local `post.interaction.updated` event.
3.  **Event Handling**: The `PostsEventHandler` listens for the event.
4.  **Redis Pub/Sub Publish**: The handler publishes the updated data to a specific Redis channel (e.g., `post_interaction_updated_POST_ID`).
5.  **Subscription Broadcast**: The GraphQL subscription manager receives the message from Redis and broadcasts the payload to all subscribed clients.

### Security/Auth Mock

Authentication is mocked by retrieving the user's ID from the `x-user-id` HTTP header.

- The `AuthGuard` checks for the presence of the `x-user-id` header.
- The `@CurrentUser()` decorator extracts the value and makes it available to the resolvers.

---

## ✅ Testing & Verification

### Initial Setup: Seeding Data

Use the following queries to create and view posts.

**1. Create a Post**

```graphql
mutation CreatePost($content: String!) {
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

**2. List All Posts**
This query retrieves all posts. You can use it to get the `id` of the post for the next test cases.

```graphql
query GetAllPosts {
  getAll {
    id
    createdAt
    content
    authorId
    likeCount
    dislikeCount
  }
}
```

### Interaction & Real-Time Tests

**Test Case 1 A (Mutation): Toggle like a Post**

```graphql
mutation LikePost($postId: ID!) {
  likePost(postId: $postId) {
    id
    content
    likeCount
    dislikeCount
    interactions {
      userId
      type
    }
    userInteraction {
      type
      userId
    }
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

**Test Case 1 B (Mutation): Toggle disLike on a Post**

```graphql
mutation DisLikePost($postId: ID!) {
  dislikePost(postId: $postId) {
    id
    content
    likeCount
    dislikeCount
    interactions {
      userId
      type
    }
    userInteraction {
      type
      userId
    }
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
  "x-user-id": "user3"
}
```

**Test Case 2 (Subscription): Subscribe to Post Updates**

```graphql
subscription OnPostUpdate($postId: ID!) {
  onPostUpdate(postId: $postId) {
    postId
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

1.  Use the creation query to create a new post and note its `id`.
2.  **Open two browser tabs/GraphQL clients** and navigate to `http://localhost:3000/graphql`.
3.  **In Tab 1**, execute the **Subscription** query using the `postId`.
4.  **In Tab 2**, execute the **Mutation** query using the same `postId` and a different `x-user-id` header.
5.  **Observe the instant update in Tab 1**. The subscription will immediately push the updated `likeCount`.
