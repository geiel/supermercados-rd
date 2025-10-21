"use server";

import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server'

export async function LoginUserGoogle() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            queryParams: {
                access_type: 'offline',
                prompt: 'consent'
            },
            redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
        },
    })

    if (error || !data?.url) {
        console.error('Google sign-in failed', error)
        throw new Error('Unable to start Google sign-in')
    }

    redirect(data.url)
}
