import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { BRAND, META, SOCIAL_LINKS } from '../config/constants';

/**
 * MetaTags Component
 * Manages all SEO-related meta tags including Open Graph and Twitter Cards
 */
const MetaTags = ({
    title = META.title,
    description = META.description,
    keywords = META.keywords,
    ogImage = META.ogImage,
    ogType = 'website',
    twitterCard = META.twitterCard,
    canonicalUrl,
    noIndex = false,
    structuredData,
}) => {
    const origin = `https://${BRAND.domain}`;
    const fullTitle = title.includes(BRAND.name) ? title : `${title} | ${BRAND.name}`;
    const fullOgImage = ogImage.startsWith('http') ? ogImage : `${origin}${ogImage}`;

    // Clean canonical URL (no query, no hash, enforced primary domain)
    let canonical = canonicalUrl;
    if (!canonical && typeof window !== 'undefined') {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        canonical = `${origin}${path}`;
    } else if (!canonical) {
        canonical = origin;
    }

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />

            {/* Canonical URL */}
            <link rel="canonical" href={canonical} />

            {/* Robots */}
            {noIndex && <meta name="robots" content="noindex, nofollow" />}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={canonical} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={fullOgImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content={BRAND.name} />
            <meta property="og:locale" content="en_US" />

            {/* Twitter */}
            <meta property="twitter:card" content={twitterCard} />
            <meta property="twitter:url" content={canonical} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={fullOgImage} />
            {META.twitterSite && <meta property="twitter:site" content={META.twitterSite} />}
            {META.twitterCreator && <meta property="twitter:creator" content={META.twitterCreator} />}

            {/* Additional SEO */}
            <meta name="author" content={BRAND.name} />
            <meta name="publisher" content={BRAND.name} />
            <meta name="theme-color" content="#E85002" />

            {/* Structured Data */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
};

/**
 * Breadcrumb Schema Component
 * Generates breadcrumb structured data for SEO
 */
export const BreadcrumbSchema = ({ items }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND.domain}`;

    const breadcrumbList = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': items.map((item, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': item.name,
            'item': item.url ? `${origin}${item.url}` : undefined,
        })),
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(breadcrumbList)}
        </script>
    );
};

/**
 * Organization Schema Component
 * Generates organization structured data
 */
export const OrganizationSchema = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND.domain}`;

    const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': BRAND.name,
        'url': origin,
        'logo': `${origin}${BRAND.logoLight}`,
        'sameAs': Object.values(SOCIAL_LINKS),
        'contactPoint': [{
            '@type': 'ContactPoint',
            'contactType': 'customer support',
            'email': 'hello@shinelstudios.in',
            'areaServed': 'IN',
            'availableLanguage': ['en', 'hi'],
        }],
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(organization)}
        </script>
    );
};

/**
 * Service Schema Component
 * Generates service structured data
 */
export const ServiceSchema = ({ services }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND.domain}`;

    const serviceSchemas = services.map(service => ({
        '@context': 'https://schema.org',
        '@type': 'Service',
        'name': service.name,
        'description': service.description,
        'provider': {
            '@type': 'Organization',
            'name': BRAND.name,
            'url': origin,
        },
        'areaServed': 'IN',
        'url': `${origin}/#services`,
    }));

    return (
        <>
            {serviceSchemas.map((schema, index) => (
                <script key={index} type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            ))}
        </>
    );
};

/**
 * FAQ Schema Component
 * Generates FAQ structured data
 */
export const FAQSchema = ({ faqs }) => {
    const faqPage = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqs.map(faq => ({
            '@type': 'Question',
            'name': faq.question,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': faq.answer,
            },
        })),
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(faqPage)}
        </script>
    );
};

/**
 * Video Schema Component
 * Generates video structured data for testimonials
 */
export const VideoSchema = ({ video }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND.domain}`;

    const videoObject = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        'name': video.name,
        'description': video.description,
        'thumbnailUrl': `${origin}${video.thumbnail}`,
        'uploadDate': video.uploadDate,
        'contentUrl': `${origin}${video.url}`,
        'embedUrl': video.embedUrl,
        'duration': video.duration,
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(videoObject)}
        </script>
    );
};

/**
 * Review Schema Component
 * Generates review/testimonial structured data
 */
export const ReviewSchema = ({ reviews }) => {
    const aggregateRating = {
        '@context': 'https://schema.org',
        '@type': 'AggregateRating',
        'ratingValue': reviews.averageRating || '5',
        'reviewCount': reviews.count || reviews.items.length,
        'bestRating': '5',
        'worstRating': '1',
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(aggregateRating)}
        </script>
    );
};

export default MetaTags;
