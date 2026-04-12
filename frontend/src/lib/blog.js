import { AUTH_BASE } from '../config/constants';

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
 * Fetch dynamic posts from Worker API
 */
const getDynamicPosts = async () => {
    try {
        const res = await fetch(`${AUTH_BASE}/blog/posts`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return (data.posts || []).map(p => ({
            slug: p.slug,
            frontmatter: {
                title: p.title,
                date: p.date,
                excerpt: p.excerpt,
                coverImage: p.coverImage,
                author: p.author,
                tags: p.tags || [],
                status: p.status
            },
            content: p.content,
            source: 'dynamic'
        }));
    } catch (e) {
        console.warn("Failed to fetch dynamic posts:", e);
        return [];
    }
};

/**
 * Load all blog posts from src/content/blog/ AND Dynamic API
 * Returns array sorted by date (newest first)
 */
export const getAllPosts = async () => {
    // 1. Static Files
    const modules = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default' });
    const staticPosts = [];

    for (const path in modules) {
        const rawContent = await modules[path]();
        const { data, content } = parseFrontmatter(rawContent);
        const slug = path.split('/').pop().replace('.md', '');

        staticPosts.push({
            slug,
            frontmatter: data,
            content,
            source: 'static'
        });
    }

    // 2. Dynamic Posts
    const dynamicPosts = await getDynamicPosts();

    // 3. Merge (Dynamic overrides Static by slug)
    const combined = new Map();
    staticPosts.forEach(p => combined.set(p.slug, p));
    dynamicPosts.forEach(p => combined.set(p.slug, p));

    return Array.from(combined.values()).sort((a, b) => {
        return new Date(b.frontmatter.date) - new Date(a.frontmatter.date);
    });
};

/**
 * Get single post by slug (checks Dynamic first, then Static)
 */
export const getPostBySlug = async (slug) => {
    try {
        // 1. Try Dynamic
        const res = await fetch(`${AUTH_BASE}/blog/posts/${slug}`);
        if (res.ok) {
            const { post } = await res.json();
            if (post) {
                return {
                    slug: post.slug,
                    frontmatter: {
                        title: post.title,
                        date: post.date,
                        excerpt: post.excerpt,
                        coverImage: post.coverImage,
                        author: post.author,
                        tags: post.tags || [],
                        status: post.status
                    },
                    content: post.content,
                    source: 'dynamic'
                };
            }
        }
    } catch { /* ignore fetch error, try static */ }

    // 2. Fallback to Static
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
            content,
            source: 'static'
        };
    } catch (e) {
        console.error(`Post not found: ${slug}`, e);
        return null;
    }
};
