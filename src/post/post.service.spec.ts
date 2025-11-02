import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types, Model } from 'mongoose';

import { AppEventEmitter } from '../common/events/event-emitter.service';
import {
  InteractionType,
  PostEventType,
} from '../common/events/types/post.events';
import { PostService } from './post.service';
import { Post } from './schemas.ts/post.schema';
import { PostInteraction } from './schemas.ts/post-interaction.schema';

describe('PostService', () => {
  let service: PostService;
  let postModel: Model<Post>;
  let interactionModel: Model<PostInteraction>;
  let eventEmitter: AppEventEmitter;
  let mockSession: any;
  const mockPostId = new Types.ObjectId();
  const mockPostInteractionId = new Types.ObjectId();

  const createMockPost = (overrides: Partial<any> = {}) => ({
    _id: mockPostId,
    authorId: 'user123',
    content: 'Test content',
    likeCount: 0,
    dislikeCount: 0,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    toDto: jest.fn((interactions: any[] = [], userId?: string) => ({
      id: mockPostId.toHexString(),
      content: 'Test content',
      authorId: 'user123',
      likeCount: 0,
      dislikeCount: 0,
      interactions,
      userInteraction: userId
        ? interactions.find((i) => i.userId === userId)?.type
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    })),
    ...overrides,
  });

  const createMockInteraction = (overrides: Partial<any> = {}) => ({
    _id: mockPostInteractionId,
    postId: mockPostId,
    userId: 'user123',
    type: InteractionType.LIKE,
    timestamp: new Date(),
    deletedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    mockSession = {
      withTransaction: jest.fn((cb) => cb()),
      endSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: getModelToken(Post.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            updateOne: jest.fn(),
            updateMany: jest.fn(),
          },
        },
        {
          provide: getModelToken(PostInteraction.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            updateOne: jest.fn(),
            updateMany: jest.fn(),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: {
            startSession: jest.fn().mockResolvedValue(mockSession),
          },
        },
        {
          provide: AppEventEmitter,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
    postModel = module.get<Model<Post>>(getModelToken(Post.name));
    interactionModel = module.get<Model<PostInteraction>>(
      getModelToken(PostInteraction.name),
    );
    eventEmitter = module.get<AppEventEmitter>(AppEventEmitter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return post when found', async () => {
      const post = createMockPost();
      (postModel.findOne as jest.Mock).mockResolvedValue(post);

      const result = await service.findById(mockPostId.toHexString());

      expect(postModel.findOne).toHaveBeenCalledWith({
        _id: mockPostId.toHexString(),
        deletedAt: null,
      });
      expect(result).toEqual(post);
    });

    it('should throw NotFoundException when not found', async () => {
      (postModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('invalid')).rejects.toThrow(
        'Post with id invalid not found',
      );
    });
  });

  describe('getAll', () => {
    it('should return all non-deleted posts', async () => {
      const posts = [createMockPost(), createMockPost()];
      (postModel.find as jest.Mock).mockResolvedValue(posts);

      const result = await service.getAll();

      expect(postModel.find).toHaveBeenCalledWith({ deletedAt: null });
      expect(result).toHaveLength(2);
      expect(posts[0].toDto).toHaveBeenCalled();
      expect(posts[1].toDto).toHaveBeenCalled();
    });

    it('should throw NotFoundException when no posts', async () => {
      (postModel.find as jest.Mock).mockResolvedValue([]);

      await expect(service.getAll()).rejects.toThrow('No posts created yet');
    });
  });

  describe('getPost', () => {
    it('should return post with interactions', async () => {
      const post = createMockPost();
      const interactions = [createMockInteraction()];
      (postModel.findOne as jest.Mock).mockResolvedValue(post);
      (interactionModel.find as jest.Mock).mockResolvedValue(interactions);

      await service.getPost(mockPostId.toHexString());

      expect(post.toDto).toHaveBeenCalledWith(interactions, undefined);
    });

    it('should return post with user interaction', async () => {
      const post = createMockPost();
      const interactions = [
        createMockInteraction({
          userId: 'user123',
          type: InteractionType.LIKE,
        }),
      ];
      (postModel.findOne as jest.Mock).mockResolvedValue(post);
      (interactionModel.find as jest.Mock).mockResolvedValue(interactions);

      await service.getPost(mockPostId.toHexString(), 'user123');

      expect(post.toDto).toHaveBeenCalledWith(interactions, 'user123');
    });

    it('should throw NotFoundException when post not found', async () => {
      (postModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getPost('invalid')).rejects.toThrow(
        'Post not found',
      );
    });
  });

  describe('createPost', () => {
    it('should create post with initial counts', async () => {
      const post = createMockPost();
      (postModel.create as jest.Mock).mockResolvedValue(post);

      await service.createPost('user123', 'Test content');

      expect(postModel.create).toHaveBeenCalledWith({
        authorId: 'user123',
        content: 'Test content',
        likeCount: 0,
        dislikeCount: 0,
      });
      expect(post.toDto).toHaveBeenCalled();
    });
  });

  describe('likePost', () => {
    it('should create new like', async () => {
      const post = createMockPost();
      const updatedPost = createMockPost({ likeCount: 1 });

      (postModel.findOne as jest.Mock)
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(post) })
        .mockResolvedValueOnce(updatedPost)
        .mockResolvedValueOnce(updatedPost);
      (interactionModel.findOne as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });
      (interactionModel.create as jest.Mock).mockResolvedValue([{}]);
      (postModel.updateOne as jest.Mock).mockResolvedValue({});
      (interactionModel.find as jest.Mock).mockResolvedValue([]);

      await service.likePost(mockPostId.toHexString(), 'user123');

      expect(interactionModel.create).toHaveBeenCalledWith(
        [
          {
            postId: mockPostId.toHexString(),
            userId: 'user123',
            type: InteractionType.LIKE,
            timestamp: expect.any(Date),
          },
        ],
        { session: mockSession },
      );
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPostId.toHexString() },
        { $inc: { likeCount: 1, dislikeCount: 0 } },
        { session: mockSession },
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PostEventType.POST_INTERACTION_UPDATED,
        expect.objectContaining({
          postId: mockPostId.toHexString(),
          userId: 'user123',
          previousState: null,
          newState: InteractionType.LIKE,
        }),
      );
    });

    it('should toggle off existing like', async () => {
      const post = createMockPost({ likeCount: 1 });
      const updatedPost = createMockPost({ likeCount: 0 });
      const interaction = createMockInteraction();

      (postModel.findOne as jest.Mock)
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(post) })
        .mockResolvedValueOnce(updatedPost)
        .mockResolvedValueOnce(updatedPost);
      (interactionModel.findOne as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(interaction),
      });
      (interactionModel.updateOne as jest.Mock).mockResolvedValue({});
      (postModel.updateOne as jest.Mock).mockResolvedValue({});
      (interactionModel.find as jest.Mock).mockResolvedValue([]);

      await service.likePost(mockPostId.toHexString(), 'user123');

      expect(interactionModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPostInteractionId },
        { deletedAt: expect.any(Date) },
        { session: mockSession },
      );
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPostId.toHexString() },
        { $inc: { likeCount: -1, dislikeCount: 0 } },
        { session: mockSession },
      );
    });

    it('should switch from dislike to like', async () => {
      const post = createMockPost({ dislikeCount: 1 });
      const updatedPost = createMockPost({ likeCount: 1, dislikeCount: 0 });
      const interaction = createMockInteraction({
        type: InteractionType.DISLIKE,
      });

      (postModel.findOne as jest.Mock)
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(post) })
        .mockResolvedValueOnce(updatedPost)
        .mockResolvedValueOnce(updatedPost);
      (interactionModel.findOne as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(interaction),
      });
      (interactionModel.updateOne as jest.Mock).mockResolvedValue({});
      (postModel.updateOne as jest.Mock).mockResolvedValue({});
      (interactionModel.find as jest.Mock).mockResolvedValue([]);

      await service.likePost(mockPostId.toHexString(), 'user123');

      expect(interactionModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPostInteractionId },
        { type: InteractionType.LIKE, timestamp: expect.any(Date) },
        { session: mockSession },
      );
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPostId.toHexString() },
        { $inc: { likeCount: 1, dislikeCount: -1 } },
        { session: mockSession },
      );
    });

    it('should throw NotFoundException when post not found', async () => {
      (postModel.findOne as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });

      await expect(service.likePost('invalid', 'user123')).rejects.toThrow(
        'Post with id invalid not found',
      );
    });
  });

  describe('dislikePost', () => {
    it('should create new dislike', async () => {
      const post = createMockPost();
      const updatedPost = createMockPost({ dislikeCount: 1 });

      (postModel.findOne as jest.Mock)
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(post) })
        .mockResolvedValueOnce(updatedPost)
        .mockResolvedValueOnce(updatedPost);
      (interactionModel.findOne as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });
      (interactionModel.create as jest.Mock).mockResolvedValue([{}]);
      (postModel.updateOne as jest.Mock).mockResolvedValue({});
      (interactionModel.find as jest.Mock).mockResolvedValue([]);

      await service.dislikePost(mockPostId.toHexString(), 'user123');

      expect(interactionModel.create).toHaveBeenCalledWith(
        [
          {
            postId: mockPostId.toHexString(),
            userId: 'user123',
            type: InteractionType.DISLIKE,
            timestamp: expect.any(Date),
          },
        ],
        { session: mockSession },
      );
      expect(postModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPostId.toHexString() },
        { $inc: { likeCount: 0, dislikeCount: 1 } },
        { session: mockSession },
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PostEventType.POST_INTERACTION_UPDATED,
        expect.objectContaining({
          postId: mockPostId.toHexString(),
          userId: 'user123',
          previousState: null,
          newState: InteractionType.DISLIKE,
        }),
      );
    });

    it('should toggle off existing dislike', async () => {
      const post = createMockPost({ dislikeCount: 1 });
      const updatedPost = createMockPost({ dislikeCount: 0 });
      const interaction = createMockInteraction({
        type: InteractionType.DISLIKE,
      });

      (postModel.findOne as jest.Mock)
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(post) })
        .mockResolvedValueOnce(updatedPost)
        .mockResolvedValueOnce(updatedPost);
      (interactionModel.findOne as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(interaction),
      });
      (interactionModel.updateOne as jest.Mock).mockResolvedValue({});
      (postModel.updateOne as jest.Mock).mockResolvedValue({});
      (interactionModel.find as jest.Mock).mockResolvedValue([]);

      await service.dislikePost(mockPostId.toHexString(), 'user123');

      expect(interactionModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPostInteractionId },
        { deletedAt: expect.any(Date) },
        { session: mockSession },
      );
    });

    it('should switch from like to dislike', async () => {
      const post = createMockPost({ likeCount: 1 });
      const updatedPost = createMockPost({ likeCount: 0, dislikeCount: 1 });
      const interaction = createMockInteraction({ type: InteractionType.LIKE });

      (postModel.findOne as jest.Mock)
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(post) })
        .mockResolvedValueOnce(updatedPost)
        .mockResolvedValueOnce(updatedPost);
      (interactionModel.findOne as jest.Mock).mockReturnValue({
        session: jest.fn().mockResolvedValue(interaction),
      });
      (interactionModel.updateOne as jest.Mock).mockResolvedValue({});
      (postModel.updateOne as jest.Mock).mockResolvedValue({});
      (interactionModel.find as jest.Mock).mockResolvedValue([]);

      await service.dislikePost(mockPostId.toHexString(), 'user123');

      expect(interactionModel.updateOne).toHaveBeenCalledWith(
        { _id: mockPostInteractionId },
        { type: InteractionType.DISLIKE, timestamp: expect.any(Date) },
        { session: mockSession },
      );
    });
  });

  describe('deleteAllPosts', () => {
    it('should soft delete all posts and interactions', async () => {
      (postModel.updateMany as jest.Mock).mockResolvedValue({});
      (interactionModel.updateMany as jest.Mock).mockResolvedValue({});

      await service.deleteAllPosts();

      expect(postModel.updateMany).toHaveBeenCalledWith(
        { deletedAt: null },
        { deletedAt: expect.any(Date) },
        { session: mockSession },
      );
      expect(interactionModel.updateMany).toHaveBeenCalledWith(
        { deletedAt: null },
        { deletedAt: expect.any(Date) },
        { session: mockSession },
      );
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });
});
