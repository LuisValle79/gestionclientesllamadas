-- Script para la gestión de roles y datos en Supabase

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  ruc VARCHAR(50),
  razon_social VARCHAR(255),
  representante VARCHAR(255),
  notas TEXT,
  fecha_proxima_llamada TIMESTAMP WITH TIME ZONE,
  fecha_proxima_visita TIMESTAMP WITH TIME ZONE,
  fecha_proxima_reunion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de mensajes
CREATE TABLE IF NOT EXISTS mensajes (
  id SERIAL PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id),
  contenido TEXT NOT NULL,
  enviado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de recordatorios
CREATE TABLE IF NOT EXISTS recordatorios (
  id SERIAL PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id),
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('llamada', 'visita', 'reunion')),
  fecha TIMESTAMP WITH TIME ZONE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS perfiles_usuario (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(255),
  apellido VARCHAR(255),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'asesor', 'cliente')),
  telefono VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear función para insertar automáticamente un perfil
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles_usuario (id, rol)
  VALUES (NEW.id, 'cliente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();

-- Habilitar RLS en las tablas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles_usuario ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla clientes
CREATE POLICY "Administradores y asesores pueden ver todos los clientes" ON clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol IN ('administrador', 'asesor')
    )
  );

CREATE POLICY "Clientes solo pueden ver sus propios datos" ON clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'cliente'
    ) AND id = auth.uid()
  );

CREATE POLICY "Administradores y asesores pueden insertar clientes" ON clientes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol IN ('administrador', 'asesor')
    )
  );

CREATE POLICY "Administradores pueden actualizar cualquier cliente" ON clientes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

CREATE POLICY "Asesores pueden actualizar clientes asignados" ON clientes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'asesor'
    )
  );

CREATE POLICY "Clientes pueden actualizar sus propios datos" ON clientes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'cliente'
    ) AND id = auth.uid()
  );

CREATE POLICY "Solo administradores pueden eliminar clientes" ON clientes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

-- Políticas para la tabla mensajes
CREATE POLICY "Administradores y asesores pueden ver todos los mensajes" ON mensajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol IN ('administrador', 'asesor')
    )
  );

CREATE POLICY "Clientes solo pueden ver sus propios mensajes" ON mensajes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'cliente'
    ) AND cliente_id = auth.uid()
  );

CREATE POLICY "Administradores y asesores pueden insertar mensajes" ON mensajes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol IN ('administrador', 'asesor')
    )
  );

CREATE POLICY "Clientes pueden insertar sus propios mensajes" ON mensajes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'cliente'
    ) AND cliente_id = auth.uid()
  );

CREATE POLICY "Solo administradores pueden actualizar mensajes" ON mensajes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

CREATE POLICY "Solo administradores pueden eliminar mensajes" ON mensajes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

-- Políticas para la tabla recordatorios
CREATE POLICY "Administradores y asesores pueden ver todos los recordatorios" ON recordatorios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol IN ('administrador', 'asesor')
    )
  );

CREATE POLICY "Clientes solo pueden ver sus propios recordatorios" ON recordatorios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'cliente'
    ) AND cliente_id = auth.uid()
  );

CREATE POLICY "Administradores y asesores pueden insertar recordatorios" ON recordatorios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol IN ('administrador', 'asesor')
    )
  );

CREATE POLICY "Clientes pueden insertar sus propios recordatorios" ON recordatorios
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'cliente'
    ) AND cliente_id = auth.uid()
  );

CREATE POLICY "Administradores pueden actualizar cualquier recordatorio" ON recordatorios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

CREATE POLICY "Asesores pueden actualizar recordatorios asignados" ON recordatorios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'asesor'
    )
  );

CREATE POLICY "Clientes pueden actualizar sus propios recordatorios" ON recordatorios
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'cliente'
    ) AND cliente_id = auth.uid()
  );

CREATE POLICY "Solo administradores pueden eliminar recordatorios" ON recordatorios
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

-- Función para actualizar el rol de un usuario
CREATE OR REPLACE FUNCTION public.actualizar_rol_usuario(usuario_id UUID, nuevo_rol VARCHAR)
RETURNS VOID AS $$
BEGIN
  IF nuevo_rol NOT IN ('administrador', 'asesor', 'cliente') THEN
    RAISE EXCEPTION 'Rol inválido: %', nuevo_rol;
  END IF;
  UPDATE public.perfiles_usuario
  SET rol = nuevo_rol, updated_at = NOW()
  WHERE id = usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar acceso a perfiles_usuario para administradores
CREATE POLICY "Administradores pueden ver y actualizar perfiles_usuario" ON perfiles_usuario
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM perfiles_usuario
      WHERE id = auth.uid() AND rol = 'administrador'
    )
  );

-- Nota: Crear el usuario administrador inicial debe hacerse desde la interfaz de Supabase
-- o usando la API de autenticación (supabase.auth.signUp).
-- Ejemplo de cómo crear un usuario administrador desde el cliente:
-- await supabase.auth.signUp({ email: 'admin@sistema.com', password: 'admin123' });
-- Luego, actualiza el rol con la función actualizar_rol_usuario:
-- SELECT public.actualizar_rol_usuario('UUID_DEL_USUARIO', 'administrador');

SELECT public.actualizar_rol_usuario('9e309fe9-4434-4564-8699-549c427ababa', 'administrador');