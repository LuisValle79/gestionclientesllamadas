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
  password?: string;
};

const Usuarios = () => {
  const theme = useTheme();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState<Partial<Usuario>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRole();
    fetchUsuarios();
  }, []);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('perfiles_usuario')
        .select('rol')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserRole(data?.rol || null);
    } catch (error: any) {
      console.error('Error al obtener rol de usuario:', error.message);
    }
  };

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
          rol: item.rol || 'cliente', // Fallback a 'cliente' si rol es null
          telefono: item.telefono || null,
          created_at: item.created_at,
        })) || []
      );
    } catch (error: any) {
      console.error('Error al cargar usuarios:', error);
      setSnackbar({ open: true, message: `Error al cargar usuarios: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (usuario?: Usuario) => {
    if (usuario) {
      setCurrentUsuario({
        ...usuario,
        password: '', // Inicializa password como cadena vacía para edición
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
    setCurrentUsuario({ ...currentUsuario, [name]: value || null }); // Maneja null para campos opcionales
  };

  const handleRoleChange = (event: SelectChangeEvent) => {
    setCurrentUsuario({
      ...currentUsuario,
      rol: event.target.value as 'administrador' | 'asesor' | 'cliente',
    });
  };

  const handleSaveUsuario = async () => {
    try {
      if (!currentUsuario.email || !currentUsuario.rol) {
        setSnackbar({ open: true, message: 'Email y rol son obligatorios', severity: 'error' });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentUsuario.email)) {
        setSnackbar({ open: true, message: 'Formato de email inválido', severity: 'error' });
        return;
      }

      if (!isEditing && (!currentUsuario.password || currentUsuario.password.length < 6)) {
        setSnackbar({
          open: true,
          message: 'La contraseña es obligatoria y debe tener al menos 6 caracteres',
          severity: 'error',
        });
        return;
      }

      if (isEditing) {
        const { error } = await supabase.rpc('actualizar_usuario', {
          usuario_id: currentUsuario.id,
          nuevo_nombre: currentUsuario.nombre || null,
          nuevo_apellido: currentUsuario.apellido || null,
          nuevo_rol: currentUsuario.rol,
          nuevo_telefono: currentUsuario.telefono || null,
        });

        if (error) throw new Error(`Error al actualizar usuario: ${error.message}`);
        setSnackbar({ open: true, message: 'Usuario actualizado correctamente', severity: 'success' });
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: currentUsuario.email,
          password: currentUsuario.password || '',
          options: {
            data: {
              nombre: currentUsuario.nombre || null,
              apellido: currentUsuario.apellido || null,
              telefono: currentUsuario.telefono || null,
            },
          },
        });

        if (authError) {
          console.error('Error en signUp:', authError);
          throw new Error(authError.message);
        }

        if (!authData.user) {
          throw new Error('No se pudo crear el usuario');
        }

        const { error: rpcError } = await supabase.rpc('crear_usuario_con_rol', {
          email: currentUsuario.email,
          nombre: currentUsuario.nombre || null,
          apellido: currentUsuario.apellido || null,
          rol: currentUsuario.rol,
          telefono: currentUsuario.telefono || null,
        });

        if (rpcError) {
          console.error('Error en crear_usuario_con_rol:', rpcError);
          throw new Error(`Error al crear perfil: ${rpcError.message}`);
        }

        setSnackbar({ open: true, message: 'Usuario creado correctamente', severity: 'success' });
      }

      handleCloseDialog();
      fetchUsuarios();
    } catch (error: any) {
      console.error('Error al guardar usuario:', error);
      setSnackbar({
        open: true,
        message: `Error al guardar usuario: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleDeleteUsuario = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        const { error } = await supabase.rpc('eliminar_usuario', { usuario_id: id });

        if (error) throw error;
        setSnackbar({ open: true, message: 'Usuario eliminado correctamente', severity: 'success' });
        fetchUsuarios();
      } catch (error: any) {
        console.error('Error al eliminar usuario:', error.message);
        setSnackbar({ open: true, message: `Error al eliminar usuario: ${error.message}`, severity: 'error' });
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

  if (userRole !== 'administrador') {
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
            autoFocus
            margin="normal"
            name="email"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={currentUsuario.email || ''}
            onChange={handleInputChange}
            disabled={isEditing}
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
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              aria-label="Contraseña del usuario"
              required
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