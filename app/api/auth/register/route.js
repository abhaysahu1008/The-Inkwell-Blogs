import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client — can create users without email confirmation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!['viewer', 'author'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Create user via admin API — this bypasses email confirmation entirely
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm, no email sent
    })

    if (authError) {
      // Handle duplicate email nicely
      if (authError.message?.toLowerCase().includes('already')) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Insert into public.users table
    const { error: dbError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
    })

    if (dbError) {
      // Rollback — delete the auth user if DB insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Failed to create profile. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: authData.user.id }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
