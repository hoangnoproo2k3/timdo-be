import { MAX_SLUG_LENGTH } from '../constants/constans';
import { generateUniqueSlug } from './slug.utils';

describe('generateUniqueSlug', () => {
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      post: {
        findFirst: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a slug from title when no duplicate exists', async () => {
    prismaMock.post.findFirst.mockResolvedValue(null);
    const slug = await generateUniqueSlug(prismaMock, 'My Post');
    expect(slug).toBe('my-post');
    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
      where: { slug: 'my-post' },
      select: { slug: true },
    });
  });

  it('should append number when slug already exists', async () => {
    prismaMock.post.findFirst
      .mockResolvedValueOnce({ slug: 'my-post' }) // Trùng lần 1
      .mockResolvedValueOnce(null); // Không trùng lần 2
    const slug = await generateUniqueSlug(prismaMock, 'My Post');
    expect(slug).toBe('my-post-1');
    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
      where: { slug: 'my-post' },
      select: { slug: true },
    });
    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
      where: { slug: 'my-post-1' },
      select: { slug: true },
    });
  });

  it('should return untitled for empty or whitespace title', async () => {
    prismaMock.post.findFirst.mockResolvedValue(null);
    const slug1 = await generateUniqueSlug(prismaMock, '');
    const slug2 = await generateUniqueSlug(prismaMock, '   ');
    expect(slug1).toBe('untitled');
    expect(slug2).toBe('untitled');
    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
      where: { slug: 'untitled' },
      select: { slug: true },
    });
  });

  it('should remove special characters from title', async () => {
    prismaMock.post.findFirst.mockResolvedValue(null);
    const slug = await generateUniqueSlug(prismaMock, 'My @#$ Post!');
    expect(slug).toBe('my-post');
    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
      where: { slug: 'my-post' },
      select: { slug: true },
    });
  });

  it('should truncate slug to 50 characters', async () => {
    prismaMock.post.findFirst.mockResolvedValue(null);
    const longTitle = 'A'.repeat(60) + ' Post'; // 66 ký tự
    const slug = await generateUniqueSlug(prismaMock, longTitle);
    expect(slug).toMatch(/^a+-post$/);
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
      where: { slug: expect.stringMatching(/^a+-post$/) },
      select: { slug: true },
    });
  });

  it('should throw error if Prisma fails', async () => {
    prismaMock.post.findFirst.mockRejectedValue(new Error('DB error'));
    await expect(generateUniqueSlug(prismaMock, 'My Post')).rejects.toThrow(
      'Failed to generate slug: DB error',
    );
  });

  // Test bổ sung: xử lý null/undefined
  it('should handle null or undefined title', async () => {
    prismaMock.post.findFirst.mockResolvedValue(null);
    const slug1 = await generateUniqueSlug(prismaMock, null as any);
    const slug2 = await generateUniqueSlug(prismaMock, undefined as any);
    expect(slug1).toBe('untitled');
    expect(slug2).toBe('untitled');
    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
      where: { slug: 'untitled' },
      select: { slug: true },
    });
  });
  it('should handle Vietnamese characters', async () => {
    prismaMock.post.findFirst.mockResolvedValue(null);
    const slug = await generateUniqueSlug(prismaMock, 'Bài viết');
    expect(slug).toBe('bai-viet');
  });
  it('should append number to untitled when it exists', async () => {
    prismaMock.post.findFirst
      .mockResolvedValueOnce({ slug: 'untitled' })
      .mockResolvedValueOnce(null);
    const slug = await generateUniqueSlug(prismaMock, '');
    expect(slug).toBe('untitled-1');
  });

  it('should truncate the baseSlug when it exceeds MAX_SLUG_LENGTH', async () => {
    const longTitle = 'A'.repeat(60); // 60 characters long title
    prismaMock.post.findFirst.mockResolvedValue(null);

    const slug = await generateUniqueSlug(prismaMock, longTitle);

    // Ensure that the slug length does not exceed the MAX_SLUG_LENGTH
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);

    // Ensure that the slug has been truncated correctly
    expect(slug).toMatch(/^a+/); // It should be a series of 'a' characters followed by any suffix
    expect(prismaMock.post.findFirst).toHaveBeenCalledWith({
      where: { slug: expect.stringMatching(/^a+/) },
      select: { slug: true },
    });
  });
  it('should handle the case where the counter is greater than 0', async () => {
    prismaMock.post.findFirst
      .mockResolvedValueOnce({ slug: 'my-post' })
      .mockResolvedValueOnce(null);
    const slug = await generateUniqueSlug(prismaMock, 'My Post');
    expect(slug).toBe('my-post-1');
  });
});
