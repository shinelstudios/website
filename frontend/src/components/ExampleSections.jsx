import React from 'react';
import { motion } from 'framer-motion';
import {
    Container,
    Section,
    Grid,
    Card,
    Button,
    Badge,
    Heading,
    Text,
} from './MobileFirst';
import {
    FilmStripTimeline,
    MetricCounter,
    BeforeAfterSlider,
    SwipeableCarousel,
    UrgencyIndicator,
} from './CinematicComponents';
import { COLORS, ANIMATIONS } from '../config/constants';

/**
 * EXAMPLE: Enhanced Hero Section
 * Mobile-first, cinematic, conversion-optimized
 */
export const EnhancedHeroExample = ({ onBookAudit }) => {
    return (
        <Section
            paddingY="xl"
            background={COLORS.cinematic}
            className="relative overflow-hidden"
        >
            {/* Spotlight effect */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: COLORS.spotlight }}
            />

            <Container maxWidth="wide">
                {/* Urgency indicator */}
                <motion.div
                    className="flex justify-center mb-6"
                    {...ANIMATIONS.fadeInDown}
                >
                    <UrgencyIndicator slotsLeft={3} nextAvailable="Feb 1" />
                </motion.div>

                {/* Main heading */}
                <motion.div {...ANIMATIONS.fadeInUp}>
                    <Heading level={1} align="center" className="mb-4">
                        <span style={{ color: COLORS.gold }}>Cinematic</span> Post-Production
                        <br />
                        That <span style={{ color: COLORS.orange }}>Converts</span>
                    </Heading>
                </motion.div>

                {/* Subheading */}
                <motion.div {...ANIMATIONS.fadeInUp} transition={{ delay: 0.1 }}>
                    <Text size="xl" className="text-center max-w-2xl mx-auto mb-8" muted>
                        AI-powered editing meets human creativity. Transform your content into
                        award-worthy productions that drive real results.
                    </Text>
                </motion.div>

                {/* Metrics */}
                <motion.div
                    className="flex flex-wrap justify-center gap-8 md:gap-12 mb-8"
                    {...ANIMATIONS.staggerContainer}
                >
                    {[
                        { value: 1500, suffix: '+', label: 'Projects Completed' },
                        { value: 50000, suffix: '+', label: 'Hours Edited' },
                        { value: 98, suffix: '%', label: 'Client Satisfaction' },
                    ].map((metric, i) => (
                        <motion.div
                            key={i}
                            className="text-center"
                            {...ANIMATIONS.scaleIn}
                        >
                            <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: COLORS.gold }}>
                                <MetricCounter value={metric.value} suffix={metric.suffix} />
                            </div>
                            <Text size="sm" muted>{metric.label}</Text>
                        </motion.div>
                    ))}
                </motion.div>

                {/* CTAs */}
                <motion.div
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                    {...ANIMATIONS.fadeInUp}
                    transition={{ delay: 0.2 }}
                >
                    <Button variant="cinematic" size="lg" onClick={onBookAudit}>
                        📅 Book Free Audit
                    </Button>
                    <Button variant="secondary" size="lg">
                        🎬 See Our Work
                    </Button>
                </motion.div>

                {/* Trust badges */}
                <motion.div
                    className="flex flex-wrap justify-center gap-3 mt-8"
                    {...ANIMATIONS.fadeIn}
                    transition={{ delay: 0.3 }}
                >
                    {['Reply in 24h', 'Money-Back Guarantee', 'Unlimited Revisions'].map((badge, i) => (
                        <Badge key={i} variant="silver" size="sm">
                            ✓ {badge}
                        </Badge>
                    ))}
                </motion.div>
            </Container>
        </Section>
    );
};

/**
 * EXAMPLE: Process Section with Film Strip Timeline
 */
export const EnhancedProcessExample = () => {
    const processSteps = [
        {
            title: 'Discovery',
            duration: 'Day 1',
            description: 'We analyze your content, audience, and goals to create a custom editing strategy tailored to your brand.'
        },
        {
            title: 'Pre-Production',
            duration: 'Day 2',
            description: 'Storyboarding, color grading plans, and music selection. We map out every frame before touching the timeline.'
        },
        {
            title: 'Editing',
            duration: 'Days 3-7',
            description: 'Professional cutting, effects, transitions, and AI-powered enhancements. This is where the magic happens.'
        },
        {
            title: 'Delivery',
            duration: 'Day 10',
            description: 'Final review, revisions, and delivery in all required formats. Your content, ready to publish.'
        },
    ];

    return (
        <Section paddingY="lg" background="var(--surface)">
            <Container>
                <div className="text-center mb-12">
                    <Badge variant="gold" size="md" className="mb-4">
                        🎬 Our Process
                    </Badge>
                    <Heading level={2} align="center">
                        From Raw Footage to Final Cut
                    </Heading>
                    <Text size="lg" className="mt-4 max-w-2xl mx-auto" muted>
                        A proven 10-day workflow that delivers cinematic results, every time
                    </Text>
                </div>

                <FilmStripTimeline steps={processSteps} />
            </Container>
        </Section>
    );
};

/**
 * EXAMPLE: Case Studies with Before/After Sliders
 */
export const EnhancedCaseStudiesExample = () => {
    const caseStudies = [
        {
            before: '/assets/case_studies/kamz-before.jpg',
            after: '/assets/case_studies/kamz-after.jpg',
            title: 'Kamz Inkzone',
            category: 'Gaming',
            metric: '+38% Retention',
            description: 'Motion graphics and AI captions increased average view duration by 38%',
        },
        {
            before: '/assets/case_studies/tech-before.jpg',
            after: '/assets/case_studies/tech-after.jpg',
            title: 'Tech Reviews Pro',
            category: 'Technology',
            metric: '+52% CTR',
            description: 'Dynamic thumbnails and hook optimization boosted click-through rate by 52%',
        },
    ];

    return (
        <Section paddingY="lg" background={COLORS.slate}>
            <Container>
                <div className="text-center mb-12">
                    <Badge variant="gold" size="md" className="mb-4">
                        📊 Proven Results
                    </Badge>
                    <Heading level={2} align="center">
                        Real Numbers, Real Growth
                    </Heading>
                    <Text size="lg" className="mt-4 max-w-2xl mx-auto" muted>
                        See the dramatic difference professional post-production makes
                    </Text>
                </div>

                <Grid cols={{ mobile: 1, tablet: 2 }} gap="lg">
                    {caseStudies.map((study, i) => (
                        <Card key={i} variant="cinematic" className="overflow-hidden">
                            <BeforeAfterSlider
                                before={study.before}
                                after={study.after}
                                alt={study.title}
                            />
                            <div className="p-6">
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Badge variant="default">{study.category}</Badge>
                                    <Badge variant="success">{study.metric}</Badge>
                                </div>
                                <Heading level={3} className="mb-2">
                                    {study.title}
                                </Heading>
                                <Text muted>{study.description}</Text>
                            </div>
                        </Card>
                    ))}
                </Grid>
            </Container>
        </Section>
    );
};

/**
 * EXAMPLE: Mobile-Optimized Testimonials
 */
export const EnhancedTestimonialsExample = () => {
    const testimonials = [
        {
            name: 'Alex Chen',
            channel: 'Tech Insights',
            avatar: '/assets/testimonials/alex.jpg',
            quote: 'Shinel Studios transformed my content. The editing quality is Hollywood-level, and my retention went through the roof!',
            metric: '+45% Watch Time',
        },
        {
            name: 'Sarah Johnson',
            channel: 'Lifestyle Vlog',
            avatar: '/assets/testimonials/sarah.jpg',
            quote: 'Best investment I made for my channel. Professional, fast, and they truly understand YouTube.',
            metric: '10M+ Views',
        },
        {
            name: 'Mike Rodriguez',
            channel: 'Gaming Pro',
            avatar: '/assets/testimonials/mike.jpg',
            quote: 'The AI-powered workflow is insane. They deliver faster than anyone else without compromising quality.',
            metric: '+200K Subs',
        },
    ];

    return (
        <Section paddingY="lg" background="var(--surface)">
            <Container>
                <div className="text-center mb-12">
                    <Badge variant="gold" size="md" className="mb-4">
                        💬 Testimonials
                    </Badge>
                    <Heading level={2} align="center">
                        Loved by Creators Worldwide
                    </Heading>
                </div>

                {/* Mobile: Swipeable */}
                <div className="md:hidden">
                    <SwipeableCarousel
                        items={testimonials}
                        renderItem={(testimonial) => (
                            <Card variant="glass">
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <img
                                            src={testimonial.avatar}
                                            alt={testimonial.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <div>
                                            <div className="font-semibold" style={{ color: 'var(--text)' }}>
                                                {testimonial.name}
                                            </div>
                                            <Text size="sm" muted>{testimonial.channel}</Text>
                                        </div>
                                    </div>
                                    <Text className="mb-4">"{testimonial.quote}"</Text>
                                    <Badge variant="gold">{testimonial.metric}</Badge>
                                </div>
                            </Card>
                        )}
                    />
                </div>

                {/* Desktop: Grid */}
                <div className="hidden md:block">
                    <Grid cols={{ desktop: 3 }} gap="lg">
                        {testimonials.map((testimonial, i) => (
                            <Card key={i} variant="glass" interactive>
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <img
                                            src={testimonial.avatar}
                                            alt={testimonial.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <div>
                                            <div className="font-semibold" style={{ color: 'var(--text)' }}>
                                                {testimonial.name}
                                            </div>
                                            <Text size="sm" muted>{testimonial.channel}</Text>
                                        </div>
                                    </div>
                                    <Text className="mb-4">"{testimonial.quote}"</Text>
                                    <Badge variant="gold">{testimonial.metric}</Badge>
                                </div>
                            </Card>
                        ))}
                    </Grid>
                </div>
            </Container>
        </Section>
    );
};

export default {
    EnhancedHeroExample,
    EnhancedProcessExample,
    EnhancedCaseStudiesExample,
    EnhancedTestimonialsExample,
};
