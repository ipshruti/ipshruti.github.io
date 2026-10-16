import { getCollection } from 'astro:content';

export const tagSlug = (tag: string) =>
  tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function getPosts() {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** All tags with their posts, keyed by slug, most-used first. */
export async function getTags() {
  const tags = new Map<string, { name: string; posts: Awaited<ReturnType<typeof getPosts>> }>();
  for (const post of await getPosts()) {
    for (const name of post.data.tags) {
      const slug = tagSlug(name);
      if (!tags.has(slug)) tags.set(slug, { name, posts: [] });
      tags.get(slug)!.posts.push(post);
    }
  }
  return [...tags.entries()]
    .map(([slug, t]) => ({ slug, ...t }))
    .sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
}
