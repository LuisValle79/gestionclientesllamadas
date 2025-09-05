import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, Box, IconButton, CircularProgress, Snackbar, Alert, TablePagination,
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
  rol: 'administrador' | 'asesor' | 'cliente';
  telefono: string | null;
  created_at: string;
  password?: string; // Añadido para creación de usuarios
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
      setUsuarios(data || []);
    } catch (error: any) {
      console.error('Error al cargar usuarios:', error.message);
      setSnackbar({ open: true, message: `Error al cargar usuarios: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (usuario?: Usuario) => {
    if (usuario) {
      setCurrentUsuario(usuario);
      setIsEditing(true);
    } else {
      setCurrentUsuario({
        email: '',
        nombre: '',
        apellido: '',
        rol: 'cliente',
        telefono: '',
        password: '', // Inicializar password para nuevos usuarios
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
    setCurrentUsuario({ ...currentUsuario, [name]: value });
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

      if (isEditing) {
        const { error } = await supabase.rpc('actualizar_usuario', {
          usuario_id: currentUsuario.id,
          nuevo_nombre: currentUsuario.nombre,
          nuevo_apellido: currentUsuario.apellido,
          nuevo_rol: currentUsuario.rol,
          nuevo_telefono: currentUsuario.telefono,
        });

        if (error) throw error;
        setSnackbar({ open: true, message: 'Usuario actualizado correctamente', severity: 'success' });
      } else {
        if (!currentUsuario.password) {
          setSnackbar({ open: true, message: 'La contraseña es obligatoria para nuevos usuarios', severity: 'error' });
          return;
        }

        const { error } = await supabase.rpc('crear_usuario_con_rol', {
          email: currentUsuario.email,
          password: currentUsuario.password,
          nombre: currentUsuario.nombre,
          apellido: currentUsuario.apellido,
          rol: currentUsuario.rol,
          telefono: currentUsuario.telefono,
        });

        if (error) throw error;
        setSnackbar({ open: true, message: 'Usuario creado correctamente', severity: 'success' });
      }

      handleCloseDialog();
      fetchUsuarios();
    } catch (error: any) {
      console.error('Error al guardar usuario:', error.message);
      setSnackbar({ open: true, message: `Error al guardar usuario: ${error.message}`, severity: 'error' });
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

  const getRolIcon = (rol: string) => {
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: theme.shape.borderRadius, boxShadow: theme.shadows[2] }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: '500' }}>
            Acceso denegado
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No tienes permisos para acceder a esta sección. Esta página está reservada para administradores.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: theme.spacing(3) }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: '600', color: theme.palette.text.primary }}>
          Gestión de Usuarios
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: theme.shape.borderRadius, px: 3, py: 1, fontSize: '0.9rem' }}
          aria-label="Crear nuevo usuario"
        >
          Nuevo Usuario
        </Button>
      </Box>

      {/* Tabla */}
      <Paper sx={{ width: '100%', borderRadius: theme.shape.borderRadius, boxShadow: theme.shadows[2], overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress aria-label="Cargando usuarios" />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table stickyHeader aria-label="Tabla de usuarios">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: '600', bgcolor: theme.palette.background.default, color: theme.palette.text.primary }}>
                      Email
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', bgcolor: theme.palette.background.default, color: theme.palette.text.primary }}>
                      Nombre
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', bgcolor: theme.palette.background.default, color: theme.palette.text.primary }}>
                      Apellido
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', bgcolor: theme.palette.background.default, color: theme.palette.text.primary }}>
                      Rol
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', bgcolor: theme.palette.background.default, color: theme.palette.text.primary }}>
                      Teléfono
                    </TableCell>
                    <TableCell sx={{ fontWeight: '600', bgcolor: theme.palette.background.default, color: theme.palette.text.primary, textAlign: 'center' }}>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usuarios
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((usuario) => (
                      <TableRow hover key={usuario.id} sx={{ '&:hover': { bgcolor: theme.palette.action.hover }, transition: 'background-color 0.2s' }}>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>{usuario.nombre || '-'}</TableCell>
                        <TableCell>{usuario.apellido || '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getRolIcon(usuario.rol)}
                            <Typography sx={{ ml: 1, fontSize: '0.9rem' }}>
                              {usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{usuario.telefono || '-'}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenDialog(usuario)}
                            size="small"
                            aria-label={`Editar usuario ${usuario.email}`}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteUsuario(usuario.id)}
                            size="small"
                            aria-label={`Eliminar usuario ${usuario.email}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
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
              sx={{ bgcolor: theme.palette.background.paper }}
            />
          </>
        )}
      </Paper>

      {/* Diálogo para agregar/editar usuario */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: theme.shape.borderRadius, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: '500' }}>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
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
            sx={{ bgcolor: theme.palette.background.paper }}
            aria-label="Email del usuario"
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
              sx={{ bgcolor: theme.palette.background.paper }}
              aria-label="Contraseña del usuario"
            />
          )}
          <TextField
            margin="normal"
            name="nombre"
            label="Nombre"
            fullWidth
            variant="outlined"
            value={currentUsuario.nombre || ''}
            onChange={handleInputChange}
            sx={{ bgcolor: theme.palette.background.paper }}
            aria-label="Nombre del usuario"
          />
          <TextField
            margin="normal"
            name="apellido"
            label="Apellido"
            fullWidth
            variant="outlined"
            value={currentUsuario.apellido || ''}
            onChange={handleInputChange}
            sx={{ bgcolor: theme.palette.background.paper }}
            aria-label="Apellido del usuario"
          />
          <FormControl fullWidth sx={{ mt: 2, bgcolor: theme.palette.background.paper }}>
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
            label="Teléfono"
            fullWidth
            variant="outlined"
            value={currentUsuario.telefono || ''}
            onChange={handleInputChange}
            sx={{ bgcolor: theme.palette.background.paper }}
            aria-label="Teléfono del usuario"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit" sx={{ borderRadius: theme.shape.borderRadius }} aria-label="Cancelar">
            Cancelar
          </Button>
          <Button
            onClick={handleSaveUsuario}
            variant="contained"
            color="primary"
            sx={{ borderRadius: theme.shape.borderRadius, px: 3 }}
            aria-label="Guardar usuario"
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: theme.shape.borderRadius }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Usuarios;