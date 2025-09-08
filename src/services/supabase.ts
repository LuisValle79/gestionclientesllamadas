// ../services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey_role = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey, supabaseKey_role);

// Log para depuración
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (primeros 5 caracteres):', supabaseKey.slice(0, 5));