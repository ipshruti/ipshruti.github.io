import { getCollection } from 'astro:content';

export const tagSlug = (tag: string) =>
  tag.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function getPosts() {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const postYear = (post: { data: { date: Date } }) => post.data.date.getUTCFullYear();

/** Years that have posts, newest first, each with its posts. */
export async function getYears() {
  const years = new Map<number, Awaited<ReturnType<typeof getPosts>>>();
  for (const post of await getPosts()) {
    const y = postYear(post);
    if (!years.has(y)) years.set(y, []);
    years.get(y)!.push(post);
  }
  return [...years.entries()].sort((a, b) => b[0] - a[0]).map(([year, posts]) => ({ year, posts }));
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
