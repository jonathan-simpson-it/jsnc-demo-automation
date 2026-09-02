import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(), description: z.string(), pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(), author: z.string().default('Jonathan Simpson'),
    tags: z.array(z.string()).default([]), image: z.string().optional(), draft: z.boolean().default(false),
  }),
});

const projectsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(), client: z.string(), description: z.string(), pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]), image: z.string().optional(),
    featured: z.boolean().default(false), draft: z.boolean().default(false),
  }),
});

export const collections = { blog: blogCollection, projects: projectsCollection };
