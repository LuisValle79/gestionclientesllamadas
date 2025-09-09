import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, Snackbar, Alert, Checkbox,
  FormControl, InputLabel, Select, MenuItem, Chip, Divider, useTheme, Fade, Grid, Skeleton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Notifications as NotificationsIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Cliente = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  created_by: string | null;
};

type Recordatorio = {
  id: string;
  cliente_id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  completado: boolean;
  created_at: string;
  created_by: string;
  cliente?: Cliente;
};

const Recordatorios = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<string | null>(null);
  const [currentRecordatorio, setCurrentRecordatorio] = useState<Partial<Recordatorio>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
  const [filtroCompletado, setFiltroCompletado] = useState<string>('pendientes');

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

const fetchUserRole = async () => {
  try {
    if (!user) throw new Error('Usuario no autenticado');
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error al consultar perfiles_usuario:', error.message);
      throw error;
    }

    if (!data) {
      console.warn('Perfil no encontrado para el usuario:', user.id);
      setUserRole('cliente');
      setSnackbar({
        open: true,
        message: 'Perfil de usuario no encontrado. Se asignó el rol cliente por defecto.',
        severity: 'warning',
      });
      return;
    }

    setUserRole(data.rol || 'cliente');
  } catch (error: any) {
    console.error('Error al obtener rol de usuario:', error.message);
    setSnackbar({
      open: true,
      message: `Error al obtener rol de usuario: ${error.message}`,
      severity: 'error',
    });
    setUserRole('cliente');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (user && userRole) {
      fetchClientes();
      fetchRecordatorios();
    }
  }, [user, userRole, filtroCompletado]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      if (!user) throw new Error('Usuario no autenticado');

      let query = supabase
        .from('clientes')
        .select('id, nombre, telefono, created_by')
        .order('nombre');

      if (userRole !== 'administrador') {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClientes(data || []);
      if (data?.length === 0) {
        setSnackbar({ open: true, message: 'No se encontraron clientes para este usuario', severity: 'warning' });
      }
    } catch (error: any) {
      console.error('Error al cargar clientes:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para ver estos clientes'
          : `Error al cargar clientes: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordatorios = async () => {
    try {
      setLoading(true);
      if (!user) throw new Error('Usuario no autenticado');

      let query = supabase
        .from('recordatorios')
        .select(`
          id,
          cliente_id,
          titulo,
          descripcion,
          fecha,
          completado,
          created_at,
          created_by,
          clientes (id, nombre, telefono, created_by)
        `)
        .order('fecha');

      if (userRole === 'cliente' && clientes.length > 0) {
        query = query.in('cliente_id', clientes.map(c => c.id));
      } else if (userRole === 'asesor') {
        query = query.eq('created_by', user.id);
      }

      if (filtroCompletado === 'pendientes') {
        query = query.eq('completado', false);
      } else if (filtroCompletado === 'completados') {
        query = query.eq('completado', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecordatorios(
        data?.map((item: any) => ({
          id: item.id,
          cliente_id: item.cliente_id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          fecha: item.fecha,
          completado: item.completado,
          created_at: item.created_at,
          created_by: item.created_by,
          cliente: item.clientes,
        })) || []
      );
    } catch (error: any) {
      console.error('Error al cargar recordatorios:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para ver estos recordatorios'
          : `Error al cargar recordatorios: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (recordatorio?: Recordatorio) => {
    if (userRole === 'cliente') {
      setSnackbar({ open: true, message: 'Los clientes no pueden crear ni editar recordatorios', severity: 'error' });
      return;
    }
    if (recordatorio) {
      if (userRole === 'asesor' && (!user || recordatorio.created_by !== user.id)) {
        setSnackbar({ open: true, message: 'No tienes permiso para editar este recordatorio', severity: 'error' });
        return;
      }
      setCurrentRecordatorio(recordatorio);
      setIsEditing(true);
    } else {
      setCurrentRecordatorio({
        fecha: new Date().toISOString(),
        completado: false,
      });
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentRecordatorio({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentRecordatorio({ ...currentRecordatorio, [name]: value.slice(0, name === 'titulo' ? 100 : 500) });
  };

  const handleClienteChange = (event: SelectChangeEvent<string>) => {
    setCurrentRecordatorio({ ...currentRecordatorio, cliente_id: event.target.value as string });
  };

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setCurrentRecordatorio({ ...currentRecordatorio, fecha: newDate.toISOString() });
    }
  };

  const handleFiltroChange = (event: SelectChangeEvent<string>) => {
    setFiltroCompletado(event.target.value);
  };

  const handleSaveRecordatorio = async () => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (!currentRecordatorio.cliente_id || !currentRecordatorio.titulo || !currentRecordatorio.fecha) {
      setSnackbar({ open: true, message: 'Cliente, título y fecha son obligatorios', severity: 'error' });
      return;
    }

    if (userRole === 'cliente') {
      setSnackbar({ open: true, message: 'Los clientes no pueden crear ni editar recordatorios', severity: 'error' });
      return;
    }

    if (userRole === 'asesor' && !clientes.find(c => c.id === currentRecordatorio.cliente_id && c.created_by === user.id)) {
      setSnackbar({ open: true, message: 'No tienes permiso para crear/editar recordatorios para este cliente', severity: 'error' });
      return;
    }

    try {
      if (isEditing && currentRecordatorio.id) {
        if (userRole === 'asesor' && currentRecordatorio.created_by !== user.id) {
          setSnackbar({ open: true, message: 'No tienes permiso para editar este recordatorio', severity: 'error' });
          return;
        }
        const { error } = await supabase.rpc('actualizar_recordatorio', {
          p_recordatorio_id: currentRecordatorio.id,
          p_cliente_id: currentRecordatorio.cliente_id,
          p_titulo: currentRecordatorio.titulo,
          p_descripcion: currentRecordatorio.descripcion || null,
          p_fecha: currentRecordatorio.fecha,
          p_completado: currentRecordatorio.completado || false,
          p_user_id: user.id,
        });

        if (error) throw error;
        setSnackbar({ open: true, message: 'Recordatorio actualizado correctamente', severity: 'success' });
      } else {
        const { error } = await supabase.rpc('crear_recordatorio', {
          p_cliente_id: currentRecordatorio.cliente_id,
          p_titulo: currentRecordatorio.titulo,
          p_descripcion: currentRecordatorio.descripcion || null,
          p_fecha: currentRecordatorio.fecha,
          p_user_id: user.id,
        });

        if (error) throw error;
        setSnackbar({ open: true, message: 'Recordatorio agregado correctamente', severity: 'success' });
      }

      handleCloseDialog();
      fetchRecordatorios();
    } catch (error: any) {
      console.error('Error al guardar recordatorio:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para guardar este recordatorio'
          : `Error al guardar recordatorio: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleToggleCompletado = async (id: string, completado: boolean) => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (userRole === 'cliente') {
      setSnackbar({ open: true, message: 'Los clientes no pueden actualizar recordatorios', severity: 'error' });
      return;
    }

    const recordatorio = recordatorios.find(r => r.id === id);
    if (userRole === 'asesor' && recordatorio?.created_by !== user.id) {
      setSnackbar({ open: true, message: 'No tienes permiso para actualizar este recordatorio', severity: 'error' });
      return;
    }

    try {
      const { error } = await supabase.rpc('actualizar_recordatorio', {
        p_recordatorio_id: id,
        p_cliente_id: recordatorio?.cliente_id,
        p_titulo: recordatorio?.titulo,
        p_descripcion: recordatorio?.descripcion || null,
        p_fecha: recordatorio?.fecha,
        p_completado: !completado,
        p_user_id: user.id,
      });

      if (error) throw error;
      setSnackbar({
        open: true,
        message: `Recordatorio marcado como ${!completado ? 'completado' : 'pendiente'}`,
        severity: 'success',
      });
      fetchRecordatorios();
    } catch (error: any) {
      console.error('Error al actualizar recordatorio:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para actualizar este recordatorio'
          : `Error al actualizar recordatorio: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleDeleteRecordatorio = async (id: string) => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (userRole === 'cliente') {
      setSnackbar({ open: true, message: 'Los clientes no pueden eliminar recordatorios', severity: 'error' });
      return;
    }

    const recordatorio = recordatorios.find(r => r.id === id);
    if (userRole === 'asesor' && recordatorio?.created_by !== user.id) {
      setSnackbar({ open: true, message: 'No tienes permiso para eliminar este recordatorio', severity: 'error' });
      return;
    }

    try {
      const { error } = await supabase.rpc('eliminar_recordatorio', {
        p_recordatorio_id: id,
        p_user_id: user.id,
      });

      if (error) throw error;
      setSnackbar({ open: true, message: 'Recordatorio eliminado correctamente', severity: 'success' });
      fetchRecordatorios();
    } catch (error: any) {
      console.error('Error al eliminar recordatorio:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para eliminar este recordatorio'
          : `Error al eliminar recordatorio: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setOpenDeleteDialog(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const isRecordatorioProximo = (fecha: string) => {
    const ahora = new Date();
    const fechaRecordatorio = new Date(fecha);
    const diferencia = fechaRecordatorio.getTime() - ahora.getTime();
    const horas = diferencia / (1000 * 60 * 60);
    return horas > 0 && horas < 24;
  };

  const isRecordatorioVencido = (fecha: string) => {
    const ahora = new Date();
    const fechaRecordatorio = new Date(fecha);
    return fechaRecordatorio < ahora;
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: 4,
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05), rgba(0, 150, 136, 0.05))',
        borderRadius: 2,
        boxShadow: theme.shadows[3],
      }}
    >
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: theme.spacing(3) }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Recordatorios
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: theme.shape.borderRadius, px: 3, py: 1, fontWeight: 600, textTransform: 'none' }}
          aria-label="Crear nuevo recordatorio"
          disabled={userRole === null || userRole === 'cliente' || clientes.length === 0}
        >
          Nuevo Recordatorio
        </Button>
      </Box>

      {/* Filtro */}
      <Box sx={{ mb: theme.spacing(3) }}>
        <FormControl variant="outlined" sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: theme.shape.borderRadius } }}>
          <InputLabel id="filtro-select-label">Mostrar</InputLabel>
          <Select
            labelId="filtro-select-label"
            id="filtro-select"
            value={filtroCompletado}
            onChange={handleFiltroChange}
            label="Mostrar"
            sx={{ bgcolor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius }}
            aria-label="Filtrar recordatorios"
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="pendientes">Pendientes</MenuItem>
            <MenuItem value="completados">Completados</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Lista de recordatorios */}
      {loading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: theme.shape.borderRadius }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {recordatorios.length > 0 ? (
            recordatorios.map((recordatorio) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={recordatorio.id}>
                <Fade in>
                  <Paper
                    sx={{
                      position: 'relative',
                      p: 2,
                      borderRadius: theme.shape.borderRadius,
                      bgcolor: recordatorio.completado
                        ? theme.palette.action.disabledBackground
                        : isRecordatorioVencido(recordatorio.fecha)
                        ? theme.palette.error.light
                        : isRecordatorioProximo(recordatorio.fecha)
                        ? theme.palette.warning.light
                        : theme.palette.background.paper,
                      boxShadow: theme.shadows[3],
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[5],
                      },
                    }}
                  >
                    {isRecordatorioProximo(recordatorio.fecha) && !recordatorio.completado && (
                      <NotificationsIcon color="warning" sx={{ position: 'absolute', top: 10, right: 10, fontSize: '1.2rem' }} />
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Checkbox
                        checked={recordatorio.completado}
                        onChange={() => handleToggleCompletado(recordatorio.id, recordatorio.completado)}
                        color="primary"
                        sx={{ p: 0.5 }}
                        aria-label={`Marcar ${recordatorio.titulo} como ${recordatorio.completado ? 'pendiente' : 'completado'}`}
                        disabled={userRole === 'cliente' || (userRole === 'asesor' && (!user || recordatorio.created_by !== user.id))}
                      />
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{
                          flexGrow: 1,
                          fontWeight: 500,
                          fontSize: '1.1rem',
                          textDecoration: recordatorio.completado ? 'line-through' : 'none',
                          color: recordatorio.completado ? theme.palette.text.disabled : theme.palette.text.primary,
                        }}
                      >
                        {recordatorio.titulo}
                      </Typography>
                    </Box>
                    <Chip
                      label={recordatorio.cliente?.nombre || 'Sin cliente'}
                      size="small"
                      sx={{ mb: 1.5, bgcolor: theme.palette.secondary.light, color: theme.palette.secondary.contrastText, fontWeight: 'medium' }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {formatDate(recordatorio.fecha)}
                    </Typography>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: recordatorio.completado ? theme.palette.text.disabled : theme.palette.text.secondary, minHeight: '3rem' }}
                    >
                      {recordatorio.descripcion || 'Sin descripción'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialog(recordatorio)}
                        sx={{ mr: 1, textTransform: 'none' }}
                        aria-label={`Editar ${recordatorio.titulo}`}
                        disabled={userRole === 'cliente' || (userRole === 'asesor' && (!user || recordatorio.created_by !== user.id))}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setOpenDeleteDialog(recordatorio.id)}
                        sx={{ textTransform: 'none' }}
                        aria-label={`Eliminar ${recordatorio.titulo}`}
                        disabled={userRole === 'cliente' || (userRole === 'asesor' && (!user || recordatorio.created_by !== user.id))}
                      >
                        Eliminar
                      </Button>
                    </Box>
                  </Paper>
                </Fade>
              </Grid>
            ))
          ) : (
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: theme.shape.borderRadius, boxShadow: theme.shadows[3] }}>
                <Typography variant="h6" color="text.secondary">
                  No hay recordatorios {filtroCompletado !== 'todos' ? (filtroCompletado === 'pendientes' ? 'pendientes' : 'completados') : ''}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Diálogo para agregar/editar recordatorio */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: theme.shape.borderRadius, p: 2 } }} TransitionComponent={Fade}>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>{isEditing ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: theme.shape.borderRadius } }}>
            <InputLabel id="cliente-select-label">Cliente *</InputLabel>
            <Select
              labelId="cliente-select-label"
              id="cliente-select"
              value={currentRecordatorio.cliente_id || ''}
              onChange={handleClienteChange}
              label="Cliente *"
              required
              sx={{ bgcolor: theme.palette.background.paper }}
              aria-label="Seleccionar cliente"
            >
              {clientes.length > 0 ? (
                clientes.map((cliente) => (
                  <MenuItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre || `Cliente ${cliente.id.slice(0, 8)}...`}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>
                  <em>No hay clientes disponibles</em>
                </MenuItem>
              )}
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            name="titulo"
            label="Título *"
            type="text"
            fullWidth
            variant="outlined"
            value={currentRecordatorio.titulo || ''}
            onChange={handleInputChange}
            required
            inputProps={{ maxLength: 100 }}
            sx={{ bgcolor: theme.palette.background.paper, '& .MuiOutlinedInput-root': { borderRadius: theme.shape.borderRadius } }}
            aria-label="Título del recordatorio"
            helperText="Máximo 100 caracteres"
          />
          <TextField
            margin="normal"
            name="descripcion"
            label="Descripción (opcional)"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={currentRecordatorio.descripcion || ''}
            onChange={handleInputChange}
            inputProps={{ maxLength: 500 }}
            sx={{ bgcolor: theme.palette.background.paper, '& .MuiOutlinedInput-root': { borderRadius: theme.shape.borderRadius } }}
            aria-label="Descripción del recordatorio"
            helperText="Máximo 500 caracteres"
          />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DateTimePicker
              label="Fecha y hora *"
              value={currentRecordatorio.fecha ? new Date(currentRecordatorio.fecha) : null}
              onChange={handleDateChange}
              minDate={new Date()}
              sx={{ mt: 2, width: '100%', bgcolor: theme.palette.background.paper, '& .MuiOutlinedInput-root': { borderRadius: theme.shape.borderRadius } }}
              slotProps={{
                textField: {
                  required: true,
                  'aria-label': 'Seleccionar fecha y hora',
                  helperText: 'Selecciona una fecha futura',
                },
              }}
            />
          </LocalizationProvider>
          {isEditing && userRole !== 'cliente' && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={currentRecordatorio.completado || false}
                onChange={(e) => setCurrentRecordatorio({ ...currentRecordatorio, completado: e.target.checked })}
                color="primary"
                aria-label="Marcar como completado"
              />
              <Typography variant="body1">Marcar como completado</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseDialog}
            color="inherit"
            sx={{ textTransform: 'none', borderRadius: theme.shape.borderRadius }}
            aria-label="Cancelar"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveRecordatorio}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: theme.shape.borderRadius }}
            aria-label="Guardar recordatorio"
            disabled={!currentRecordatorio.cliente_id || !currentRecordatorio.titulo || !currentRecordatorio.fecha}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para confirmar eliminación */}
      <Dialog
        open={!!openDeleteDialog}
        onClose={() => setOpenDeleteDialog(null)}
        PaperProps={{ sx: { p: 2, borderRadius: theme.shape.borderRadius } }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar este recordatorio?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenDeleteDialog(null)}
            color="inherit"
            sx={{ textTransform: 'none', borderRadius: theme.shape.borderRadius }}
            aria-label="Cancelar"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => openDeleteDialog && handleDeleteRecordatorio(openDeleteDialog)}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: theme.shape.borderRadius }}
            aria-label="Eliminar recordatorio"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={Fade}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', fontWeight: 500, borderRadius: theme.shape.borderRadius }}
          iconMapping={{
            success: <NotificationsIcon fontSize="inherit" />,
            error: <DeleteIcon fontSize="inherit" />,
            warning: <NotificationsIcon fontSize="inherit" />,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Recordatorios;