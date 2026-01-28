import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { BRAND, META, SOCIAL_LINKS, CONTACT } from '../config/constants';

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
    const location = useLocation();
    const origin = `https://${BRAND.domain}`;
    const fullTitle = title.includes(BRAND.name) ? title : `${title} | ${BRAND.name}`;
    const fullOgImage = ogImage.startsWith('http') ? ogImage : `${origin}${ogImage}`;

    // Clean canonical URL (no query, no hash, enforced primary domain)
    // Preference: Prop > useLocation (Router) > Origin fallback
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const canonical = canonicalUrl || `${origin}${path}`;

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
            'item': item.url ? (item.url.startsWith('http') ? item.url : `${origin}${item.url}`) : undefined,
        })),
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(breadcrumbList)}
        </script>
    );
};

/**
 * WebSite Schema Component
 * Generates website structured data with sitelinks search box
 */
export const WebSiteSchema = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND.domain}`;

    const website = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': BRAND.name,
        'url': origin,
        'potentialAction': {
            '@type': 'SearchAction',
            'target': `${origin}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(website)}
        </script>
    );
};

/**
 * LocalBusiness Schema Component
 * Generates local business structured data (ProfessionalService)
 */
export const LocalBusinessSchema = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND.domain}`;

    const business = {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        'name': BRAND.name,
        'image': `${origin}${BRAND.logoLight}`,
        '@id': `${origin}/#organization`,
        'url': origin,
        'telephone': '+91-8968141585',
        'address': {
            '@type': 'PostalAddress',
            'streetAddress': 'Mohali, Punjab',
            'addressLocality': 'Mohali',
            'addressRegion': 'Punjab',
            'postalCode': '160055',
            'addressCountry': 'IN',
        },
        'geo': {
            '@type': 'GeoCoordinates',
            'latitude': 30.7046,
            'longitude': 76.7179,
        },
        'sameAs': Object.values(SOCIAL_LINKS),
        'openingHoursSpecification': {
            '@type': 'OpeningHoursSpecification',
            'dayOfWeek': [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday'
            ],
            'opens': '10:00',
            'closes': '21:00'
        }
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(business)}
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
        'description': 'Shinel Studios is a premier video production and AI-powered growth agency for the world\'s top YouTube creators, including Kamz Inkzone, Deadlox Gaming, Manav Sukhija, and Gamer Mummy. We specialize in high-conversion editing, thumbnail design, and content strategy.',
        'sameAs': Object.values(SOCIAL_LINKS),
        'knowsAbout': [
            'Kamz Inkzone',
            'Deadlox Gaming',
            'Manav Sukhija',
            'Gamer Mummy',
            'Aish is Live',
            'Video Editing for YouTube',
            'Thumbnail Design for Creators'
        ],
        'contactPoint': [{
            '@type': 'ContactPoint',
            'contactType': 'customer support',
            'email': CONTACT.email,
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

/**
 * Product Schema Component
 * Generates product structured data for services
 * Helps with rich snippets in search results
 */
export const ProductSchema = ({ product }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND.domain}`;

    // Ensure image is an array (Google requires this)
    const imageArray = product.image
        ? (Array.isArray(product.image)
            ? product.image.map(img => img.startsWith('http') ? img : `${origin}${img}`)
            : [(product.image.startsWith('http') ? product.image : `${origin}${product.image}`)])
        : [`${origin}${META.ogImage}`];

    const productData = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': product.name,
        'description': product.description,
        'image': imageArray, // Must be an array
        'brand': {
            '@type': 'Brand',
            'name': BRAND.name,
        },
        'offers': {
            '@type': 'Offer',
            'url': product.url || origin,
            'priceCurrency': product.currency || 'INR',
            'price': product.price,
            'priceValidUntil': product.priceValidUntil || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            'availability': product.availability || 'https://schema.org/InStock',
            'seller': {
                '@type': 'Organization',
                'name': BRAND.name,
            },
            // Required: Merchant Return Policy
            'hasMerchantReturnPolicy': {
                '@type': 'MerchantReturnPolicy',
                'applicableCountry': 'IN',
                'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
                'merchantReturnDays': 7,
                'returnMethod': 'https://schema.org/ReturnByMail',
                'returnFees': 'https://schema.org/FreeReturn',
            },
            // Required: Shipping Details
            'shippingDetails': {
                '@type': 'OfferShippingDetails',
                'shippingRate': {
                    '@type': 'MonetaryAmount',
                    'value': '0',
                    'currency': 'INR',
                },
                'shippingDestination': {
                    '@type': 'DefinedRegion',
                    'addressCountry': 'IN',
                },
                'deliveryTime': {
                    '@type': 'ShippingDeliveryTime',
                    'handlingTime': {
                        '@type': 'QuantitativeValue',
                        'minValue': 0,
                        'maxValue': 1,
                        'unitCode': 'DAY',
                    },
                    'transitTime': {
                        '@type': 'QuantitativeValue',
                        'minValue': 1,
                        'maxValue': 3,
                        'unitCode': 'DAY',
                    },
                },
            },
        },
        ...(product.aggregateRating && {
            'aggregateRating': {
                '@type': 'AggregateRating',
                'ratingValue': product.aggregateRating.ratingValue || '5',
                'reviewCount': product.aggregateRating.reviewCount || '50',
                'bestRating': '5',
                'worstRating': '1',
            },
        }),
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(productData)}
        </script>
    );
};

/**
 * HowTo Schema Component
 * Generates how-to structured data for tutorial/guide pages
 */
export const HowToSchema = ({ howTo }) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : `https://${BRAND.domain}`;

    const howToData = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        'name': howTo.name,
        'description': howTo.description,
        'image': howTo.image ? `${origin}${howTo.image}` : undefined,
        'totalTime': howTo.totalTime,
        'estimatedCost': howTo.estimatedCost,
        'tool': howTo.tools,
        'supply': howTo.supplies,
        'step': howTo.steps.map((step, index) => ({
            '@type': 'HowToStep',
            'position': index + 1,
            'name': step.name,
            'text': step.text,
            'image': step.image ? `${origin}${step.image}` : undefined,
            'url': step.url ? `${origin}${step.url}` : undefined,
        })),
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(howToData)}
        </script>
    );
};

export default MetaTags;
