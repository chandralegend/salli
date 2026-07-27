import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";

const reader = createReader(process.cwd(), keystaticConfig);

export async function getAllPosts() {
  const posts = await reader.collections.posts.all();
  return posts
    .map((p) => ({
      slug: p.slug,
      title: p.entry.title,
      excerpt: p.entry.excerpt,
      category: p.entry.category,
      publishedDate: p.entry.publishedDate ?? "",
      readTime: p.entry.readTime,
      coverStyle: p.entry.coverStyle,
      coverImage: p.entry.coverImage ?? null,
      coverImageAlt: p.entry.coverImageAlt || p.entry.title,
      author: p.entry.author,
    }))
    .sort((a, b) => (a.publishedDate < b.publishedDate ? 1 : -1));
}

export async function getPost(slug: string) {
  const post = await reader.collections.posts.read(slug);
  if (!post) return null;
  return { ...post, publishedDate: post.publishedDate ?? "" };
}

export async function getAllSlugs() {
  return reader.collections.posts.list();
}
