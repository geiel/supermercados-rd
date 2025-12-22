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

export async function LoginUserEmailPassword(email: string, password: string) {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    redirect("/")
}

export async function LogOutUser() {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.log(error);
        return;
    }

    redirect("/")
}

export async function validateAdminUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user || user.id !== process.env.ADMIN_ID) {
        redirect('/');
    }
}