import posthog from 'posthog-js'
import * as Sentry from '@sentry/nextjs'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2025-11-30'
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
