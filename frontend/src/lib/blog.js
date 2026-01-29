/**
 * Lightweight frontmatter parser for the browser
 * Avoids dependencies on Node.js globals like Buffer
 */
function parseFrontmatter(fileContent) {
    const regex = /^---\r?\n([\s\S]*?)\n---/;
    const match = fileContent.match(regex);

    if (!match) return { data: {}, content: fileContent };

    const frontmatterBlock = match[1];
    const content = fileContent.slice(match[0].length).trim();

    const data = {};
    const lines = frontmatterBlock.split('\n');

    lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
            const key = line.slice(0, colonIndex).trim();
            let value = line.slice(colonIndex + 1).trim();

            // Remove quotes
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            // Parse common YAML types
            if (value.startsWith('[') && value.endsWith(']')) {
                // Simple array [a, b, c]
                value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            } else if (value === 'true') {
                value = true;
            } else if (value === 'false') {
                value = false;
            } else if (!isNaN(value) && value !== '') {
                value = Number(value);
            }

            data[key] = value;
        }
    });

    return { data, content };
}

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
        const { data, content } = parseFrontmatter(rawContent);

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
        const modules = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default' });
        const path = `../content/blog/${slug}.md`;

        if (!modules[path]) {
            throw new Error(`Post not found: ${slug}`);
        }

        const rawContent = await modules[path]();
        const { data, content } = parseFrontmatter(rawContent);

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
