-- Funciones RPC para la gestión de usuarios

-- Función para obtener usuarios con sus perfiles
CREATE OR REPLACE FUNCTION public.get_usuarios_con_perfiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  nombre TEXT,
  apellido TEXT,
  rol TEXT,
  telefono TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario actual sea administrador
  IF NOT EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol = 'administrador') THEN
    RAISE EXCEPTION 'Solo los administradores pueden ver la lista de usuarios';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    pu.nombre,
    pu.apellido,
    pu.rol,
    pu.telefono,
    au.created_at
  FROM 
    auth.users au
  JOIN 
    public.perfiles_usuario pu ON au.id = pu.id
  ORDER BY 
    au.created_at DESC;
    
END;
$$;

-- Función para actualizar un usuario existente
CREATE OR REPLACE FUNCTION public.actualizar_usuario(
  usuario_id UUID,
  nuevo_nombre TEXT,
  nuevo_apellido TEXT,
  nuevo_rol TEXT,
  nuevo_telefono TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario actual sea administrador
  IF NOT EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol = 'administrador') THEN
    RAISE EXCEPTION 'Solo los administradores pueden actualizar usuarios';
  END IF;
  
  -- Actualizar el perfil del usuario
  UPDATE public.perfiles_usuario
  SET 
    nombre = nuevo_nombre,
    apellido = nuevo_apellido,
    rol = nuevo_rol,
    telefono = nuevo_telefono,
    updated_at = NOW()
  WHERE id = usuario_id;
  
END;
$$;

-- Función para eliminar un usuario
CREATE OR REPLACE FUNCTION public.eliminar_usuario(usuario_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario actual sea administrador
  IF NOT EXISTS (SELECT 1 FROM perfiles_usuario WHERE id = auth.uid() AND rol = 'administrador') THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar usuarios';
  END IF;
  
  -- Verificar que no se esté intentando eliminar al propio usuario
  IF usuario_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propio usuario';
  END IF;
  
  -- Eliminar el perfil del usuario
  DELETE FROM public.perfiles_usuario
  WHERE id = usuario_id;
  
  -- Eliminar el usuario de auth.users
  DELETE FROM auth.users
  WHERE id = usuario_id;
  
END;
$$;

-- Función para verificar el rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT rol INTO user_role FROM perfiles_usuario WHERE id = auth.uid();
  RETURN user_role;
END;
$$;