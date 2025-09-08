import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, CircularProgress, Snackbar, Alert, TablePagination,
  FormControl, InputLabel, Select, MenuItem, useTheme,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Support as AsesorIcon,
  Person as ClienteIcon,
} from '@mui/icons-material';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Usuario = {
  id: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  rol: 'administrador' | 'asesor' | 'cliente' | null;
  telefono: string | null;
  created_at: string;
};

const Usuarios = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState<Partial<Usuario> & { password?: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      setLoading(false);
      return;
    }
    console.log('Usuario autenticado:', user.id);
    fetchUserRole();
  }, [user]);

  const fetchUserRole = async () => {
    try {
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      const { data, error } = await supabase
        .from('perfiles_usuario')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      console.log('Rol del usuario:', data?.rol);
      setUserRole(data?.rol || null);
    } catch (error: any) {
      console.error('Error al obtener rol de usuario:', error.message);
      setSnackbar({ open: true, message: `Error al obtener rol de usuario: ${error.message}`, severity: 'error' });
      setUserRole(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'administrador') {
      fetchUsuarios();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_usuarios_con_perfiles');
      if (error) throw error;
      console.log('Usuarios obtenidos:', data);
      setUsuarios(
        data?.map((item: any) => ({
          id: item.id,
          email: item.email,
          nombre: item.nombre || null,
          apellido: item.apellido || null,
          rol: item.rol || 'cliente',
          telefono: item.telefono || null,
          created_at: item.created_at,
        })) || []
      );
    } catch (error: any) {
      console.error('Error al cargar usuarios:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy') || error.message.includes('Solo los administradores')
          ? 'No tienes permiso para ver los usuarios'
          : `Error al cargar usuarios: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (usuario?: Usuario) => {
    if (!user || userRole !== 'administrador') {
      setSnackbar({ open: true, message: 'No tienes permiso para realizar esta acción', severity: 'error' });
      return;
    }
    if (usuario) {
      console.log('Abriendo diálogo para editar usuario:', usuario);
      setCurrentUsuario({
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        telefono: usuario.telefono,
      });
      setIsEditing(true);
    } else {
      setCurrentUsuario({
        email: '',
        nombre: null,
        apellido: null,
        rol: 'cliente',
        telefono: null,
        password: '',
      });
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentUsuario({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'telefono' && value && !/^\+?\d{0,15}$/.test(value)) {
      setSnackbar({ open: true, message: 'Teléfono debe contener solo números y un máximo de 15 dígitos', severity: 'error' });
      return;
    }
    setCurrentUsuario({
      ...currentUsuario,
      [name]: value.slice(0, name === 'nombre' || name === 'apellido' ? 50 : name === 'email' ? 255 : name === 'password' ? 128 : 15) || null,
    });
  };

  const handleRoleChange = (event: SelectChangeEvent) => {
    setCurrentUsuario({
      ...currentUsuario,
      rol: event.target.value as 'administrador' | 'asesor' | 'cliente',
    });
  };

  const handleSaveUsuario = async () => {
    if (!user || userRole !== 'administrador') {
      setSnackbar({ open: true, message: 'No tienes permiso para realizar esta acción', severity: 'error' });
      return;
    }

    if (!currentUsuario.email || !currentUsuario.rol) {
      setSnackbar({ open: true, message: 'Email y rol son obligatorios', severity: 'error' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentUsuario.email)) {
      setSnackbar({ open: true, message: 'Formato de email inválido', severity: 'error' });
      return;
    }

    if (!isEditing && (!currentUsuario.password || currentUsuario.password.length < 8 || !/[A-Z]/.test(currentUsuario.password) || !/[0-9]/.test(currentUsuario.password))) {
      setSnackbar({
        open: true,
        message: 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula y un número',
        severity: 'error',
      });
      return;
    }

    try {
      if (isEditing) {
        console.log('Actualizando usuario:', currentUsuario);
        const { error } = await supabase.rpc('actualizar_usuario', {
          usuario_id: currentUsuario.id,
          nuevo_nombre: currentUsuario.nombre || null,
          nuevo_apellido: currentUsuario.apellido || null,
          nuevo_rol: currentUsuario.rol,
          nuevo_telefono: currentUsuario.telefono || null,
        });

        if (error) {
          console.error('Error en RPC actualizar_usuario:', error);
          throw error;
        }
        setSnackbar({ open: true, message: 'Usuario actualizado correctamente', severity: 'success' });
      } else {
        console.log('Creando usuario:', currentUsuario);
        const response = await fetch('http://localhost:3000/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user,
            email: currentUsuario.email,
            password: currentUsuario.password,
            nombre: currentUsuario.nombre,
            apellido: currentUsuario.apellido,
            rol: currentUsuario.rol,
            telefono: currentUsuario.telefono,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.error.includes('already registered')) {
            setSnackbar({ open: true, message: 'El email ya está registrado', severity: 'error' });
          }
          throw new Error(errorData.error);
        }

        setSnackbar({ open: true, message: 'Usuario creado correctamente', severity: 'success' });
      }

      handleCloseDialog();
      fetchUsuarios();
    } catch (error: any) {
      console.error('Error al guardar usuario:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy') || error.message.includes('Solo los administradores')
          ? 'No tienes permiso para guardar este usuario'
          : `Error al guardar usuario: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (!user || userRole !== 'administrador') {
      setSnackbar({ open: true, message: 'No tienes permiso para realizar esta acción', severity: 'error' });
      return;
    }

    if (id === user.id) {
      setSnackbar({ open: true, message: 'No puedes eliminar tu propio usuario', severity: 'error' });
      return;
    }

    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        console.log('Eliminando usuario con ID:', id);
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) {
          console.error('Error en admin.deleteUser:', authError);
          throw authError;
        }
        const { error: rpcError } = await supabase.rpc('eliminar_usuario', { usuario_id: id });
        if (rpcError) {
          console.error('Error en RPC eliminar_usuario:', rpcError);
          throw rpcError;
        }
        setSnackbar({ open: true, message: 'Usuario eliminado correctamente', severity: 'success' });
        fetchUsuarios();
      } catch (error: any) {
        console.error('Error al eliminar usuario:', error.message);
        setSnackbar({
          open: true,
          message: error.message.includes('User not allowed') ? 'No tienes permisos suficientes para eliminar usuarios (clave de servicio requerida)' : `Error al eliminar usuario: ${error.message}`,
          severity: 'error',
        });
      }
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getRolIcon = (rol: string | null) => {
    switch (rol) {
      case 'administrador':
        return <AdminIcon color="primary" sx={{ fontSize: '1.2rem' }} />;
      case 'asesor':
        return <AsesorIcon color="secondary" sx={{ fontSize: '1.2rem' }} />;
      case 'cliente':
        return <ClienteIcon color="action" sx={{ fontSize: '1.2rem' }} />;
      default:
        return null;
    }
  };

  if (!user || userRole !== 'administrador') {
    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          p: { xs: 2, sm: 3, md: 4 },
          bgcolor: theme.palette.background.paper,
          borderRadius: 2,
          boxShadow: theme.shadows[3],
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{ fontWeight: 500, color: theme.palette.text.primary }}
        >
          Acceso denegado
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No tienes permisos para acceder a esta sección. Esta página está reservada para administradores.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        p: { xs: 2, sm: 3, md: 4 },
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[3],
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, color: theme.palette.text.primary }}
        >
          Gestión de Usuarios
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2, px: 3, py: 1 }}
          aria-label="Crear nuevo usuario"
        >
          Nuevo Usuario
        </Button>
      </Box>

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            bgcolor: theme.palette.background.default,
            borderRadius: 2,
          }}
        >
          <CircularProgress size={32} aria-label="Cargando usuarios" />
        </Box>
      ) : (
        <Paper
          sx={{
            width: '100%',
            overflow: 'hidden',
            borderRadius: 2,
            boxShadow: theme.shadows[3],
          }}
        >
          <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            <Table stickyHeader aria-label="Tabla de usuarios">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100], color: theme.palette.text.primary }}>
                    Email
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100], color: theme.palette.text.primary }}>
                    Nombre
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100], color: theme.palette.text.primary }}>
                    Apellido
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100], color: theme.palette.text.primary }}>
                    Rol
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100], color: theme.palette.text.primary }}>
                    Teléfono
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: theme.palette.grey[100], color: theme.palette.text.primary, textAlign: 'center' }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((usuario) => (
                    <TableRow
                      hover
                      key={usuario.id}
                      sx={{
                        '&:nth-of-type(odd)': { backgroundColor: theme.palette.background.default },
                        '&:hover': { backgroundColor: theme.palette.action.hover },
                      }}
                    >
                      <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{usuario.email}</TableCell>
                      <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{usuario.nombre || '-'}</TableCell>
                      <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{usuario.apellido || '-'}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getRolIcon(usuario.rol)}
                          <Typography sx={{ fontSize: '0.9rem' }}>
                            {usuario.rol ? usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1) : 'Sin rol'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5, fontSize: '0.9rem' }}>{usuario.telefono || '-'}</TableCell>
                      <TableCell align="center" sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenDialog(usuario)}
                            size="small"
                            aria-label={`Editar usuario ${usuario.email}`}
                            sx={{ '&:hover': { bgcolor: theme.palette.primary.light, color: '#fff' } }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteUsuario(usuario.id)}
                            size="small"
                            aria-label={`Eliminar usuario ${usuario.email}`}
                            disabled={usuario.id === user.id}
                            sx={{ '&:hover': { bgcolor: theme.palette.error.light, color: '#fff' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                {usuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, fontSize: '1rem', color: theme.palette.text.secondary }}>
                      No hay usuarios registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={usuarios.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
          />
        </Paper>
      )}

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, p: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
          {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus={!isEditing}
            margin="normal"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={currentUsuario.email || ''}
            onChange={handleInputChange}
            disabled={isEditing}
            inputProps={{ maxLength: 255 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            aria-label="Email del usuario"
            required
          />
          {!isEditing && (
            <TextField
              margin="normal"
              name="password"
              label="Contraseña"
              type="password"
              fullWidth
              variant="outlined"
              value={currentUsuario.password || ''}
              onChange={handleInputChange}
              inputProps={{ maxLength: 128 }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              aria-label="Contraseña del usuario"
              required
              helperText="Mínimo 8 caracteres, con al menos una mayúscula y un número"
            />
          )}
          <TextField
            margin="normal"
            name="nombre"
            label="Nombre (opcional)"
            fullWidth
            variant="outlined"
            value={currentUsuario.nombre || ''}
            onChange={handleInputChange}
            inputProps={{ maxLength: 50 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            aria-label="Nombre del usuario"
          />
          <TextField
            margin="normal"
            name="apellido"
            label="Apellido (opcional)"
            fullWidth
            variant="outlined"
            value={currentUsuario.apellido || ''}
            onChange={handleInputChange}
            inputProps={{ maxLength: 50 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            aria-label="Apellido del usuario"
          />
          <FormControl
            fullWidth
            sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            <InputLabel id="rol-label">Rol</InputLabel>
            <Select
              labelId="rol-label"
              value={currentUsuario.rol || 'cliente'}
              label="Rol"
              onChange={handleRoleChange}
              aria-label="Seleccionar rol del usuario"
            >
              <MenuItem value="administrador">Administrador</MenuItem>
              <MenuItem value="asesor">Asesor</MenuItem>
              <MenuItem value="cliente">Cliente</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            name="telefono"
            label="Teléfono (opcional)"
            fullWidth
            variant="outlined"
            value={currentUsuario.telefono || ''}
            onChange={handleInputChange}
            inputProps={{ maxLength: 15 }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            aria-label="Teléfono del usuario"
            helperText="Incluye el código de país (ej: +51987654321)"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2 }}
            aria-label="Cancelar"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveUsuario}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, px: 3 }}
            aria-label="Guardar usuario"
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Usuarios;