import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, CircularProgress, Snackbar, Alert, Checkbox,
  FormControl, InputLabel, Select, MenuItem, Chip, Divider, useTheme, Grid2,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Notifications as NotificationsIcon } from '@mui/icons-material';
import { supabase } from '../services/supabase';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

type Cliente = {
  id: number;
  nombre: string;
  telefono: string;
};

type Recordatorio = {
  id: number;
  cliente_id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  completado: boolean;
  created_at: string;
  cliente?: Cliente;
};

const Recordatorios = () => {
  const theme = useTheme();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRecordatorio, setCurrentRecordatorio] = useState<Partial<Recordatorio>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [filtroCompletado, setFiltroCompletado] = useState<string>('pendientes');

  useEffect(() => {
    fetchClientes();
    fetchRecordatorios();
  }, [filtroCompletado]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, telefono')
        .order('nombre');

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error('Error al cargar clientes:', error.message);
      setSnackbar({ open: true, message: `Error al cargar clientes: ${error.message}`, severity: 'error' });
    }
  };

  const fetchRecordatorios = async () => {
    try {
      setLoading(true);
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
          clientes (id, nombre, telefono)
        `)
        .order('fecha');

      if (filtroCompletado === 'pendientes') {
        query = query.eq('completado', false);
      } else if (filtroCompletado === 'completados') {
        query = query.eq('completado', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecordatorios(
        data?.map((item) => ({
          id: item.id,
          cliente_id: item.cliente_id,
          titulo: item.titulo,
          descripcion: item.descripcion,
          fecha: item.fecha,
          completado: item.completado,
          created_at: item.created_at,
          cliente: item.clientes,
        })) || []
      );
    } catch (error: any) {
      console.error('Error al cargar recordatorios:', error.message);
      setSnackbar({ open: true, message: `Error al cargar recordatorios: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (recordatorio?: Recordatorio) => {
    if (recordatorio) {
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
    setCurrentRecordatorio({ ...currentRecordatorio, [name]: value });
  };

  const handleClienteChange = (event: SelectChangeEvent<number>) => {
    setCurrentRecordatorio({ ...currentRecordatorio, cliente_id: event.target.value as number });
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
    try {
      if (!currentRecordatorio.cliente_id || !currentRecordatorio.titulo || !currentRecordatorio.fecha) {
        setSnackbar({ open: true, message: 'Cliente, título y fecha son obligatorios', severity: 'error' });
        return;
      }

      if (isEditing && currentRecordatorio.id) {
        const { error } = await supabase
          .from('recordatorios')
          .update({
            cliente_id: currentRecordatorio.cliente_id,
            titulo: currentRecordatorio.titulo,
            descripcion: currentRecordatorio.descripcion || '',
            fecha: currentRecordatorio.fecha,
            completado: currentRecordatorio.completado,
          })
          .eq('id', currentRecordatorio.id);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Recordatorio actualizado correctamente', severity: 'success' });
      } else {
        const { error } = await supabase
          .from('recordatorios')
          .insert([
            {
              cliente_id: currentRecordatorio.cliente_id,
              titulo: currentRecordatorio.titulo,
              descripcion: currentRecordatorio.descripcion || '',
              fecha: currentRecordatorio.fecha,
              completado: false,
            },
          ]);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Recordatorio agregado correctamente', severity: 'success' });
      }

      handleCloseDialog();
      fetchRecordatorios();
    } catch (error: any) {
      console.error('Error al guardar recordatorio:', error.message);
      setSnackbar({ open: true, message: `Error al guardar recordatorio: ${error.message}`, severity: 'error' });
    }
  };

  const handleToggleCompletado = async (id: number, completado: boolean) => {
    try {
      const { error } = await supabase
        .from('recordatorios')
        .update({ completado: !completado })
        .eq('id', id);

      if (error) throw error;
      setSnackbar({
        open: true,
        message: `Recordatorio marcado como ${!completado ? 'completado' : 'pendiente'}`,
        severity: 'success',
      });
      fetchRecordatorios();
    } catch (error: any) {
      console.error('Error al actualizar recordatorio:', error.message);
      setSnackbar({ open: true, message: `Error al actualizar recordatorio: ${error.message}`, severity: 'error' });
    }
  };

  const handleDeleteRecordatorio = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este recordatorio?')) {
      try {
        const { error } = await supabase
          .from('recordatorios')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSnackbar({ open: true, message: 'Recordatorio eliminado correctamente', severity: 'success' });
        fetchRecordatorios();
      } catch (error: any) {
        console.error('Error al eliminar recordatorio:', error.message);
        setSnackbar({ open: true, message: `Error al eliminar recordatorio: ${error.message}`, severity: 'error' });
      }
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: theme.spacing(3) }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: '600', color: theme.palette.text.primary }}>
          Recordatorios
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: theme.shape.borderRadius, px: 3, py: 1, fontSize: '0.9rem' }}
          aria-label="Crear nuevo recordatorio"
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
            sx={{ bgcolor: theme.palette.background.paper }}
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
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress aria-label="Cargando recordatorios" />
        </Box>
      ) : (
        <Grid2 container spacing={2}>
          {recordatorios.length > 0 ? (
            recordatorios.map((recordatorio) => (
              <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={recordatorio.id}>
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
                    boxShadow: theme.shadows[2],
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[4],
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
                    />
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{
                        flexGrow: 1,
                        fontWeight: '500',
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
                      sx={{ mr: 1 }}
                      aria-label={`Editar ${recordatorio.titulo}`}
                    >
                      Editar
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteRecordatorio(recordatorio.id)}
                      aria-label={`Eliminar ${recordatorio.titulo}`}
                    >
                      Eliminar
                    </Button>
                  </Box>
                </Paper>
              </Grid2>
            ))
          ) : (
            <Grid2 size={{ xs: 12 }}>
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: theme.shape.borderRadius, boxShadow: theme.shadows[2] }}>
                <Typography variant="h6" color="text.secondary">
                  No hay recordatorios {filtroCompletado !== 'todos' ? (filtroCompletado === 'pendientes' ? 'pendientes' : 'completados') : ''}
                </Typography>
              </Paper>
            </Grid2>
          )}
        </Grid2>
      )}

      {/* Diálogo para agregar/editar recordatorio */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: theme.shape.borderRadius, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: '500' }}>{isEditing ? 'Editar Recordatorio' : 'Nuevo Recordatorio'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="cliente-select-label">Cliente</InputLabel>
            <Select
              labelId="cliente-select-label"
              id="cliente-select"
              value={currentRecordatorio.cliente_id || ''}
              onChange={handleClienteChange}
              label="Cliente"
              required
              sx={{ bgcolor: theme.palette.background.paper }}
              aria-label="Seleccionar cliente"
            >
              {clientes.map((cliente) => (
                <MenuItem key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            name="titulo"
            label="Título"
            type="text"
            fullWidth
            variant="outlined"
            value={currentRecordatorio.titulo || ''}
            onChange={handleInputChange}
            required
            sx={{ bgcolor: theme.palette.background.paper }}
            aria-label="Título del recordatorio"
          />
          <TextField
            margin="normal"
            name="descripcion"
            label="Descripción"
            multiline
            rows={3}
            fullWidth
            variant="outlined"
            value={currentRecordatorio.descripcion || ''}
            onChange={handleInputChange}
            sx={{ bgcolor: theme.palette.background.paper }}
            aria-label="Descripción del recordatorio"
          />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DateTimePicker
              label="Fecha y hora"
              value={currentRecordatorio.fecha ? new Date(currentRecordatorio.fecha) : null}
              onChange={handleDateChange}
              sx={{ mt: 2, width: '100%', bgcolor: theme.palette.background.paper }}
              slotProps={{
                textField: {
                  required: true,
                  'aria-label': 'Seleccionar fecha y hora',
                },
              }}
            />
          </LocalizationProvider>
          {isEditing && (
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
          <Button onClick={handleCloseDialog} color="inherit" sx={{ borderRadius: theme.shape.borderRadius }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveRecordatorio}
            variant="contained"
            color="primary"
            sx={{ borderRadius: theme.shape.borderRadius, px: 3 }}
            aria-label="Guardar recordatorio"
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

export default Recordatorios;