import matter from 'gray-matter';

/**
 * Load all blog posts from src/content/blog/
 * Returns array sorted by date (newest first)
 */
export const getAllPosts = async () => {
    // Import all .md files from content/blog
    // Using query: '?raw' to ensure we get the file content string
    const modules = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default' });

    const posts = [];

    for (const path in modules) {
        const rawContent = await modules[path]();
        const { data, content } = matter(rawContent);

        // Extract slug from filename (e.g., "../content/blog/my-post.md" -> "my-post")
        const slug = path.split('/').pop().replace('.md', '');

        posts.push({
            slug,
            frontmatter: data,
            content // Keeping raw content for rendering
        });
    }

    return posts.sort((a, b) => {
        return new Date(b.frontmatter.date) - new Date(a.frontmatter.date);
    });
};

/**
 * Get single post by slug
 */
export const getPostBySlug = async (slug) => {
    try {
        const module = await import(`../content/blog/${slug}.md?raw`);
        const { data, content } = matter(module.default);
        return {
            slug,
            frontmatter: data,
            content
        };
    } catch (e) {
        console.error(`Post not found: ${slug}`, e);
        return null;
    }
};
