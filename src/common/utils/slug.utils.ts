import { Prisma } from '@prisma/client';
import { MAX_SLUG_LENGTH, vietnameseMap } from '../constants/constans';

/**
 * Chuyển ký tự có dấu thành không dấu một cách tối ưu hơn
 */
function removeVietnameseAccents(str: string): string {
  if (!str) return '';

  const result = str
    .split('')
    .map((char) => vietnameseMap[char] || char)
    .join('');

  return result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tạo slug cơ bản từ tiêu đề
 */
function createBaseSlug(title: string): string {
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return 'untitled';
  }

  return removeVietnameseAccents(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Tạo slug độc nhất cho bài viết
 */
export async function generateUniqueSlug(
  prisma: Prisma.TransactionClient,
  title: string,
): Promise<string> {
  let baseSlug = createBaseSlug(title);
  let counter = 0;

  if (baseSlug.length > MAX_SLUG_LENGTH) {
    const postIndex = baseSlug.lastIndexOf('-post');
    if (postIndex !== -1 && postIndex > MAX_SLUG_LENGTH - 6) {
      const prefixLength = MAX_SLUG_LENGTH - 5;
      baseSlug = baseSlug.slice(0, prefixLength) + '-post';
    } else {
      baseSlug = baseSlug.slice(0, MAX_SLUG_LENGTH);
    }
  }

  try {
    let slug: string;
    let isSlugExists: boolean;

    do {
      const suffix = counter === 0 ? '' : `-${counter}`;
      const maxBaseLength = MAX_SLUG_LENGTH - suffix.length;
      slug = baseSlug.slice(0, maxBaseLength) + suffix;

      // Check in both article and post tables
      const [existingArticle, existingPost] = await Promise.all([
        prisma.article.findFirst({
          select: { slug: true },
          where: { slug },
        }),
        prisma.post.findFirst({
          select: { slug: true },
          where: { slug },
        }),
      ]);

      isSlugExists = !!(existingArticle || existingPost);
      counter++;
    } while (isSlugExists);

    return slug;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate slug: ${errorMessage}`);
  }
}
