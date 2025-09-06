import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, Snackbar, Alert, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Divider, FormControl, InputLabel, Select,
  MenuItem, IconButton, Skeleton, InputAdornment, Fade, type TextFieldProps, Checkbox, FormControlLabel,
} from '@mui/material';
import { Send as SendIcon, PersonAdd as PersonAddIcon, Delete as DeleteIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { es } from 'date-fns/locale';
import { supabase } from '../services/supabase';

type Cliente = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  razon_social: string | null;
};

type Mensaje = {
  id: string;
  cliente_id: string;
  contenido: string;
  tipo: 'enviado' | 'recibido';
  created_at: string;
  cliente?: Cliente;
};

const Mensajes = () => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [nuevoClienteRazonSocial, setNuevoClienteRazonSocial] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<string | null>(null);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (selectedClientes.length === 1 && isValidUUID(selectedClientes[0])) {
      console.log('Fetching mensajes for cliente_id:', selectedClientes[0]);
      fetchMensajes(selectedClientes[0]);
    } else {
      setMensajes([]);
      setLoading(false);
    }
  }, [selectedClientes]);

  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, razon_social')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Clientes obtenidos:', data);
      setClientes(data || []);
      if (data?.length === 0) {
        setSnackbar({ open: true, message: 'No se encontraron clientes en la base de datos', severity: 'warning' });
      }
    } catch (error: any) {
      console.error('Error al cargar clientes:', error.message);
      setSnackbar({ open: true, message: `Error al cargar clientes: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMensajes = async (clienteId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mensajes')
        .select(`
          id,
          cliente_id,
          contenido,
          tipo,
          created_at,
          clientes!mensajes_cliente_id_fkey (id, nombre, telefono, razon_social)
        `)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const mensajesMapped = data?.map((item) => ({
        id: item.id,
        cliente_id: item.cliente_id,
        contenido: item.contenido,
        tipo: item.tipo,
        created_at: item.created_at,
        cliente: item.clientes && item.clientes.length > 0 ? item.clientes[0] : undefined,
      })) || [];
      console.log('Mensajes obtenidos para cliente_id:', clienteId, mensajesMapped);
      setMensajes(mensajesMapped);
    } catch (error: any) {
      console.error('Error al cargar mensajes:', error.message);
      setSnackbar({ open: true, message: `Error al cargar mensajes: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClienteChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    console.log('Selected clientes:', value);
    setSelectedClientes(value);
    setSelectAll(value.length === clientes.length && clientes.length > 0);
    setNuevoMensaje('');
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSelectAll(checked);
    setSelectedClientes(checked ? clientes.map(c => c.id) : []);
    setNuevoMensaje('');
  };

  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNuevoClienteNombre('');
    setNuevoClienteTelefono('');
    setNuevoClienteRazonSocial('');
  };

  const handleAddCliente = async () => {
    try {
      const clienteData = {
        id: crypto.randomUUID(),
        nombre: nuevoClienteNombre.trim() || null,
        telefono: nuevoClienteTelefono.trim() || null,
        razon_social: nuevoClienteRazonSocial.trim() || null,
      };

      const { error } = await supabase
        .from('clientes')
        .insert([clienteData]);

      if (error) throw error;
      setSnackbar({ open: true, message: 'Cliente agregado correctamente', severity: 'success' });
      handleCloseDialog();
      fetchClientes();
    } catch (error: any) {
      console.error('Error al agregar cliente:', error.message);
      setSnackbar({ open: true, message: `Error al agregar cliente: ${error.message}`, severity: 'error' });
    }
  };

  const generatePersonalizedMessage = (cliente: Cliente) => {
    if (!cliente || !cliente.nombre) return nuevoMensaje || 'Mensaje no personalizado';
    const nombre = cliente.nombre;
    const razonSocial = cliente.razon_social || 'su empresa';
    return `Hola, señor ${nombre}. 👋
Soy Luis Valle, representante comercial de EXCELSIUS, una empresa conformada por ingenieros full stack especializados en el desarrollo de software para distintos sectores de negocio.

En EXCELSIUS ayudamos a empresas como ${razonSocial} a optimizar su gestión, reducir costos, aumentar productividad, mejorar la toma de decisiones y crecer a través de soluciones tecnológicas personalizadas: desde sistemas ERP que integran procesos completos, hasta desarrollo de software a medida, aplicaciones móviles, inteligencia de negocios con Power BI y soluciones de e-commerce.

📅 Me gustaría coordinar una reunión breve para conocer sus necesidades específicas y mostrarle cómo podemos apoyarlos a potenciar la competitividad de ${razonSocial} con soluciones digitales a su medida.`;
  };

  const handleGeneratePersonalizedMessage = () => {
    if (selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0])) {
      setSnackbar({ open: true, message: 'Selecciona exactamente un cliente para personalizar el mensaje', severity: 'error' });
      return;
    }

    const cliente = clientes.find((c) => c.id === selectedClientes[0]);
    if (!cliente || !cliente.nombre) {
      setSnackbar({ open: true, message: 'El cliente seleccionado no tiene nombre registrado', severity: 'error' });
      return;
    }

    const personalizedMessage = generatePersonalizedMessage(cliente);
    setNuevoMensaje(personalizedMessage);
  };

  const handleEnviarMensaje = async () => {
    if (selectedClientes.length === 0 || !nuevoMensaje.trim()) {
      setSnackbar({ open: true, message: 'Selecciona al menos un cliente y escribe un mensaje', severity: 'error' });
      return;
    }

    try {
      const messagesToInsert = selectedClientes
        .filter(id => isValidUUID(id))
        .map(clienteId => {
          const cliente = clientes.find(c => c.id === clienteId);
          const contenido = cliente?.nombre && cliente?.razon_social 
            ? generatePersonalizedMessage(cliente)
            : nuevoMensaje;
          return {
            cliente_id: clienteId,
            contenido,
            tipo: 'enviado',
          };
        });

      const { error } = await supabase
        .from('mensajes')
        .insert(messagesToInsert);

      if (error) throw error;

      const clientsWithPhone = selectedClientes
        .map(id => clientes.find(c => c.id === id))
        .filter((c): c is Cliente => !!c && !!c.telefono);

      clientsWithPhone.forEach(cliente => {
        const contenido = cliente.nombre && cliente.razon_social 
          ? generatePersonalizedMessage(cliente)
          : nuevoMensaje;
        const formattedPhone = cliente.telefono!.replace(/\D/g, '');
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(contenido)}`, '_blank');
      });

      if (clientsWithPhone.length < selectedClientes.length) {
        setSnackbar({ 
          open: true, 
          message: `Mensajes registrados, pero algunos no se enviaron por WhatsApp (sin teléfono)`, 
          severity: 'warning' 
        });
      } else {
        setSnackbar({ open: true, message: 'Mensajes enviados correctamente', severity: 'success' });
      }

      setNuevoMensaje('');
      if (selectedClientes.length === 1) {
        fetchMensajes(selectedClientes[0]);
      } else {
        setMensajes([]);
      }
    } catch (error: any) {
      console.error('Error al enviar mensajes:', error.message);
      setSnackbar({ open: true, message: `Error al enviar mensajes: ${error.message}`, severity: 'error' });
    }
  };

  const handleScheduleMessage = async () => {
    if (selectedClientes.length === 0 || !nuevoMensaje.trim() || !scheduledDate) {
      setSnackbar({ open: true, message: 'Selecciona al menos un cliente, escribe un mensaje y selecciona una fecha/hora', severity: 'error' });
      return;
    }

    try {
      const messagesToInsert = selectedClientes
        .filter(id => isValidUUID(id))
        .map(clienteId => {
          const cliente = clientes.find(c => c.id === clienteId);
          const contenido = cliente?.nombre && cliente?.razon_social 
            ? generatePersonalizedMessage(cliente)
            : nuevoMensaje;
          return {
            cliente_id: clienteId,
            contenido,
            scheduled_at: scheduledDate.toISOString(),
          };
        });

      const { error } = await supabase
        .from('scheduled_messages')
        .insert(messagesToInsert);

      if (error) throw error;

      setNuevoMensaje('');
      setScheduledDate(null);
      setOpenScheduleDialog(false);
      setSnackbar({ open: true, message: `Mensajes programados correctamente para ${selectedClientes.length} cliente(s)`, severity: 'success' });
    } catch (error: any) {
      console.error('Error al programar mensajes:', error.message);
      setSnackbar({ open: true, message: `Error al programar mensajes: ${error.message}`, severity: 'error' });
    }
  };

  const handleRegistrarMensajeRecibido = async () => {
    if (selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0]) || !nuevoMensaje.trim()) {
      setSnackbar({ open: true, message: 'Selecciona exactamente un cliente válido y escribe el mensaje recibido', severity: 'error' });
      return;
    }

    try {
      const { error } = await supabase
        .from('mensajes')
        .insert([
          {
            cliente_id: selectedClientes[0],
            contenido: nuevoMensaje,
            tipo: 'recibido',
          },
        ]);

      if (error) throw error;

      setNuevoMensaje('');
      setSnackbar({ open: true, message: 'Mensaje recibido registrado correctamente', severity: 'success' });
      fetchMensajes(selectedClientes[0]);
    } catch (error: any) {
      console.error('Error al registrar mensaje recibido:', error.message);
      setSnackbar({ open: true, message: `Error al registrar mensaje: ${error.message}`, severity: 'error' });
    }
  };

  const handleDeleteMensaje = async (id: string) => {
    try {
      const { error } = await supabase
        .from('mensajes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSnackbar({ open: true, message: 'Mensaje eliminado correctamente', severity: 'success' });
      fetchMensajes(selectedClientes[0]);
    } catch (error: any) {
      console.error('Error al eliminar mensaje:', error.message);
      setSnackbar({ open: true, message: `Error al eliminar mensaje: ${error.message}`, severity: 'error' });
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

  const getClienteDisplayName = (cliente: Cliente) => {
    if (cliente.nombre && cliente.telefono) {
      return `${cliente.nombre} (${cliente.telefono})`;
    } else if (cliente.nombre) {
      return cliente.nombre;
    } else if (cliente.telefono) {
      return cliente.telefono;
    } else {
      return `Cliente ${cliente.id.slice(0, 8)}...`;
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: 4,
        mb: 4,
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05), rgba(0, 150, 136, 0.05))',
        p: 3,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontWeight: 700, color: 'primary.main', mb: 4 }}
      >
        Mensajes
      </Typography>

      {/* Client Selection */}
      <Box sx={{ mb: 4 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={selectAll}
              onChange={handleSelectAllChange}
              color="primary"
              aria-label="Seleccionar todos los clientes"
            />
          }
          label="Seleccionar todos los clientes"
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth variant="outlined">
          <InputLabel id="cliente-select-label">Seleccionar Clientes</InputLabel>
          <Select
            labelId="cliente-select-label"
            id="cliente-select"
            multiple
            value={selectedClientes}
            onChange={handleClienteChange}
            label="Seleccionar Clientes"
            aria-label="Seleccionar clientes"
            sx={{
              bgcolor: 'background.paper',
              '& .MuiSelect-select': { py: 1.5 },
            }}
            renderValue={(selected) => {
              if (selected.length === 0) return <em>Seleccione clientes</em>;
              if (selectAll) return 'Todos los clientes';
              return selected
                .map(id => clientes.find(c => c.id === id))
                .filter((c): c is Cliente => !!c)
                .map(getClienteDisplayName)
                .join(', ');
            }}
          >
            {clientes.length > 0 ? (
              clientes.map((cliente) => (
                <MenuItem key={cliente.id} value={cliente.id}>
                  <Checkbox checked={selectedClientes.includes(cliente.id)} />
                  <ListItemText primary={getClienteDisplayName(cliente)} />
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>
                <em>No hay clientes disponibles</em>
              </MenuItem>
            )}
          </Select>
        </FormControl>
        {clientes.length === 0 && !loading && (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No se encontraron clientes. Agrega un nuevo cliente para comenzar.
          </Typography>
        )}
      </Box>

      {/* Message List (only for single client) */}
      {selectedClientes.length === 1 && isValidUUID(selectedClientes[0]) && (
        <Paper
          sx={{
            p: 3,
            maxHeight: '50vh',
            overflow: 'auto',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 5px rgba(0, 0, 0, 0.08)',
            transition: 'box-shadow 0.2s ease-in-out',
            '&:hover': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)' },
          }}
        >
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={80} sx={{ mb: 2 }} />
              ))}
            </Box>
          ) : mensajes.length > 0 ? (
            <List>
              {mensajes.map((mensaje, index) => (
                <Fade key={mensaje.id} in>
                  <Box>
                    {index > 0 && <Divider variant="inset" component="li" />}
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        justifyContent: mensaje.tipo === 'enviado' ? 'flex-end' : 'flex-start',
                        py: 1.5,
                        '& .MuiListItemText-root': {
                          maxWidth: '70%',
                        },
                      }}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          aria-label={`Eliminar mensaje ${mensaje.contenido}`}
                          onClick={() => setOpenDeleteDialog(mensaje.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      {mensaje.tipo === 'recibido' && (
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            {mensaje.cliente?.nombre?.charAt(0) || '?'}
                          </Avatar>
                        </ListItemAvatar>
                      )}
                      <ListItemText
                        primary={mensaje.contenido}
                        secondary={formatDate(mensaje.created_at)}
                        sx={{
                          bgcolor: mensaje.tipo === 'enviado' ? 'primary.light' : 'grey.200',
                          p: 2,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                          transition: 'transform 0.2s ease',
                          '&:hover': { transform: 'scale(1.02)' },
                        }}
                      />
                      {mensaje.tipo === 'enviado' && (
                        <ListItemAvatar sx={{ ml: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>Yo</Avatar>
                        </ListItemAvatar>
                      )}
                    </ListItem>
                  </Box>
                </Fade>
              ))}
            </List>
          ) : (
            <Typography align="center" color="text.secondary" sx={{ p: 2 }}>
              No hay mensajes para mostrar
            </Typography>
          )}
        </Paper>
      )}

      {/* Message Input (always shown when at least one client is selected) */}
      {selectedClientes.length > 0 && (
        <Paper
          sx={{
            p: 3,
            mt: 3,
            bgcolor: 'background.paper',
            boxShadow: '0 1px 5px rgba(0, 0, 0, 0.08)',
            transition: 'box-shadow 0.2s ease-in-out',
            '&:hover': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              label="Escribe un mensaje"
              multiline
              rows={3}
              variant="outlined"
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              aria-label="Escribe un mensaje"
              sx={{ bgcolor: 'background.paper' }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="caption" color="text.secondary">
                      {nuevoMensaje.length}/500
                    </Typography>
                  </InputAdornment>
                ),
              }}
              inputProps={{ maxLength: 500 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 120 }}>
              <Button
                variant="contained"
                color="primary"
                endIcon={<SendIcon />}
                onClick={handleEnviarMensaje}
                disabled={!nuevoMensaje.trim() || selectedClientes.length === 0}
                aria-label="Enviar mensaje"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark', transform: 'translateY(-1px)' },
                }}
              >
                Enviar
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleRegistrarMensajeRecibido}
                disabled={!nuevoMensaje.trim() || selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0])}
                aria-label="Registrar mensaje recibido"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Registrar Recibido
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGeneratePersonalizedMessage}
                disabled={selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0])}
                aria-label="Ingresar mensaje personalizado"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: 'primary.dark',
                  '&:hover': { bgcolor: 'primary.main', transform: 'translateY(-1px)' },
                }}
              >
                Mensaje Personalizado
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<ScheduleIcon />}
                onClick={() => setOpenScheduleDialog(true)}
                disabled={!nuevoMensaje.trim() || selectedClientes.length === 0}
                aria-label="Programar mensaje"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Programar
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Placeholder when no clients are selected */}
      {selectedClientes.length === 0 && (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.paper',
            boxShadow: '0 1px 5px rgba(0, 0, 0, 0.08)',
            transition: 'box-shadow 0.2s ease-in-out',
            '&:hover': { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)' },
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Selecciona al menos un cliente para enviar mensajes
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenDialog}
            sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
            aria-label="Agregar nuevo cliente"
          >
            Agregar Nuevo Cliente
          </Button>
        </Paper>
      )}

      {/* Add Client Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        PaperProps={{ sx: { p: 2 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>Agregar Nuevo Cliente</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre (opcional)"
            value={nuevoClienteNombre}
            onChange={(e) => setNuevoClienteNombre(e.target.value)}
            sx={{ mt: 2 }}
            aria-label="Nombre del cliente"
          />
          <TextField
            fullWidth
            label="Teléfono (opcional)"
            value={nuevoClienteTelefono}
            onChange={(e) => setNuevoClienteTelefono(e.target.value)}
            sx={{ mt: 2 }}
            aria-label="Teléfono del cliente"
            inputProps={{ pattern: '[0-9]*' }}
            helperText="Incluye el código de país (ej: +51987654321)"
          />
          <TextField
            fullWidth
            label="Razón Social (opcional)"
            value={nuevoClienteRazonSocial}
            onChange={(e) => setNuevoClienteRazonSocial(e.target.value)}
            sx={{ mt: 2 }}
            aria-label="Razón social del cliente"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            color="inherit"
            aria-label="Cancelar"
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddCliente}
            variant="contained"
            color="primary"
            aria-label="Agregar cliente"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Message Dialog */}
      <Dialog
        open={openScheduleDialog}
        onClose={() => setOpenScheduleDialog(false)}
        PaperProps={{ sx: { p: 2 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>Programar Mensaje</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DateTimePicker
              label="Fecha y hora de envío"
              value={scheduledDate}
              onChange={(newValue) => setScheduledDate(newValue)}
              minDate={new Date()}
              sx={{ mt: 2, width: '100%' }}
              slotProps={{
                textField: { variant: 'outlined', ariaLabel: 'Seleccionar fecha y hora' } as Partial<TextFieldProps>,
              }}
            />
          </LocalizationProvider>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Selecciona la fecha y hora en la que deseas que se envíe el mensaje a {selectedClientes.length} cliente(s).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenScheduleDialog(false)}
            color="inherit"
            aria-label="Cancelar"
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleScheduleMessage}
            variant="contained"
            color="primary"
            disabled={!scheduledDate || !nuevoMensaje.trim()}
            aria-label="Programar mensaje"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Programar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!openDeleteDialog}
        onClose={() => setOpenDeleteDialog(null)}
        PaperProps={{ sx: { p: 2 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar este mensaje?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDeleteDialog(null)}
            color="inherit"
            aria-label="Cancelar"
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => openDeleteDialog && handleDeleteMensaje(openDeleteDialog)}
            variant="contained"
            color="error"
            aria-label="Eliminar mensaje"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for Notifications */}
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
          sx={{ width: '100%', fontWeight: 500 }}
          iconMapping={{
            success: <SendIcon fontSize="inherit" />,
            error: <DeleteIcon fontSize="inherit" />,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Mensajes;