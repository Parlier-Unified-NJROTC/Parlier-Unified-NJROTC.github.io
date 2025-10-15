// copying items from the astro docs

// "Monopoly Money" is a good song.
// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content';

// 2. Import loader(s)
import { glob, file } from 'astro/loaders';

// 3. Define your collection(s)
const departments = defineCollection({ 
  loader: glob({ pattern: "**/*.md", base: "./src/data/departments" }),
});
const teams = defineCollection({ 
  loader: glob({ pattern: "**/*.md", base: "./src/data/teams" }),
});

// 4. Export a single `collections` object to register your collection(s)
export const collections = { departments, teams };