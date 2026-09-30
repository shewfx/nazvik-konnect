import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

let client: SupabaseClient | undefined

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseKey)
  } catch (e) {
    console.error('Supabase init failed:', e)
  }
}

if (!client) {
  // Chainable dummy client so the app doesn't crash
  const chainable = () => {
    const q = new Proxy(() => Promise.resolve({ data: null, error: null }), {
      get(_t, prop) {
        if (['then', 'catch', 'finally'].includes(prop as string)) {
          return (cb: unknown) => Promise.resolve({ data: null, error: null })[prop as 'then'](cb as never)
        }
        return chainable()
      },
    })
    return q
  }

  client = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      if (prop === 'from') return () => chainable()
      return chainable()
    },
  }) as SupabaseClient
}

export const supabase = client
