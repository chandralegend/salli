import { config, fields, collection } from "@keystatic/core";

const CATEGORIES = ["Tax", "Money basics", "Foreign income", "FIRE", "Product"] as const;

const COVER_STYLES = [
  { label: "Ink (dark)", value: "ink" },
  { label: "Red gradient", value: "red-gradient" },
  { label: "Deep green", value: "green" },
  { label: "Ink gradient", value: "ink-gradient" },
] as const;

export default config({
  storage: {
    kind: "local",
  },
  collections: {
    posts: collection({
      label: "Blog posts",
      slugField: "title",
      path: "src/content/posts/*",
      format: { contentField: "content" },
      schema: {
        title: fields.slug({ name: { label: "Title" } }),
        excerpt: fields.text({
          label: "Excerpt",
          description: "Short teaser shown on the blog index card.",
          multiline: true,
        }),
        category: fields.select({
          label: "Category",
          options: CATEGORIES.map((c) => ({ label: c, value: c })),
          defaultValue: "Product",
        }),
        publishedDate: fields.date({
          label: "Published date",
          defaultValue: { kind: "today" },
        }),
        readTime: fields.text({
          label: "Read time",
          description: "e.g. \"6 min read\"",
          defaultValue: "5 min read",
        }),
        coverStyle: fields.select({
          label: "Cover style",
          options: [...COVER_STYLES],
          defaultValue: "ink",
        }),
        author: fields.text({ label: "Author", defaultValue: "The Salli team" }),
        content: fields.markdoc({ label: "Content" }),
      },
    }),
  },
});
