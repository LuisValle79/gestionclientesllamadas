import { createClient } from '@supabase/supabase-js'

// Usar variables de entorno para las credenciales de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Verificar que las variables de entorno estén definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Variables de entorno de Supabase no definidas. Asegúrate de crear un archivo .env basado en .env.example')
}

export const supabase = createClient(supabaseUrl, supabaseKey)