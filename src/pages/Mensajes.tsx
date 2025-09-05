import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, Snackbar, Alert, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Divider, FormControl, InputLabel, Select,
  MenuItem, IconButton, Skeleton, InputAdornment, Fade,
} from '@mui/material';
import { Send as SendIcon, PersonAdd as PersonAddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import { supabase } from '../services/supabase';

type Cliente = {
  id: string;
  nombre: string;
  telefono: string;
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
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (selectedCliente && isValidUUID(selectedCliente)) {
      console.log('Fetching mensajes for cliente_id:', selectedCliente);
      fetchMensajes(selectedCliente);
    } else {
      setMensajes([]);
      setLoading(false);
    }
  }, [selectedCliente]);

  // Validar si un string es un UUID válido
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Fetch clients from Supabase
  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, telefono')
        .order('nombre');

      if (error) throw error;
      setClientes(data || []);
    } catch (error: any) {
      console.error('Error al cargar clientes:', error.message);
      setSnackbar({ open: true, message: `Error al cargar clientes: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific client
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
          clientes!mensajes_cliente_id_fkey (id, nombre, telefono)
        `)
        .eq('cliente_id', clienteId)
        .order('created_at');

      if (error) throw error;
    setMensajes(
      data?.map((item) => ({
        id: item.id,
        cliente_id: item.cliente_id,
        contenido: item.contenido,
        tipo: item.tipo,
        created_at: item.created_at,
        cliente: item.clientes && item.clientes.length > 0 ? item.clientes[0] : undefined, // Toma el primer cliente del arreglo
      })) || []
    );
    } catch (error: any) {
      console.error('Error al cargar mensajes:', error.message);
      setSnackbar({ open: true, message: `Error al cargar mensajes: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle client selection
  const handleClienteChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    console.log('Selected cliente:', value);
    setSelectedCliente(value);
  };

  // Open/close dialogs
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNuevoClienteNombre('');
    setNuevoClienteTelefono('');
  };

  // Add new client
  const handleAddCliente = async () => {
    if (!nuevoClienteNombre.trim() || !nuevoClienteTelefono.trim()) {
      setSnackbar({ open: true, message: 'Ingresa nombre y teléfono del cliente', severity: 'error' });
      return;
    }

    try {
      const { error } = await supabase
        .from('clientes')
        .insert([{ nombre: nuevoClienteNombre, telefono: nuevoClienteTelefono }]);

      if (error) throw error;
      setSnackbar({ open: true, message: 'Cliente agregado correctamente', severity: 'success' });
      handleCloseDialog();
      fetchClientes();
    } catch (error: any) {
      console.error('Error al agregar cliente:', error.message);
      setSnackbar({ open: true, message: `Error al agregar cliente: ${error.message}`, severity: 'error' });
    }
  };

  // Send message via WhatsApp
  const handleEnviarMensaje = async () => {
    if (!selectedCliente || !isValidUUID(selectedCliente) || !nuevoMensaje.trim()) {
      setSnackbar({ open: true, message: 'Selecciona un cliente válido y escribe un mensaje', severity: 'error' });
      return;
    }

    try {
      const { error } = await supabase
        .from('mensajes')
        .insert([
          {
            cliente_id: selectedCliente,
            contenido: nuevoMensaje,
            tipo: 'enviado',
          },
        ]);

      if (error) throw error;

      const cliente = clientes.find((c) => c.id === selectedCliente);
      if (cliente) {
        const formattedPhone = cliente.telefono.replace(/\D/g, '');
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(nuevoMensaje)}`, '_blank');
      }

      setNuevoMensaje('');
      setSnackbar({ open: true, message: 'Mensaje enviado correctamente', severity: 'success' });
      fetchMensajes(selectedCliente);
    } catch (error: any) {
      console.error('Error al enviar mensaje:', error.message);
      setSnackbar({ open: true, message: `Error al enviar mensaje: ${error.message}`, severity: 'error' });
    }
  };

  // Register received message
  const handleRegistrarMensajeRecibido = async () => {
    if (!selectedCliente || !isValidUUID(selectedCliente) || !nuevoMensaje.trim()) {
      setSnackbar({ open: true, message: 'Selecciona un cliente válido y escribe el mensaje recibido', severity: 'error' });
      return;
    }

    try {
      const { error } = await supabase
        .from('mensajes')
        .insert([
          {
            cliente_id: selectedCliente,
            contenido: nuevoMensaje,
            tipo: 'recibido',
          },
        ]);

      if (error) throw error;

      setNuevoMensaje('');
      setSnackbar({ open: true, message: 'Mensaje recibido registrado correctamente', severity: 'success' });
      fetchMensajes(selectedCliente);
    } catch (error: any) {
      console.error('Error al registrar mensaje recibido:', error.message);
      setSnackbar({ open: true, message: `Error al registrar mensaje: ${error.message}`, severity: 'error' });
    }
  };

  // Delete message
  const handleDeleteMensaje = async (id: string) => {
    try {
      const { error } = await supabase
        .from('mensajes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSnackbar({ open: true, message: 'Mensaje eliminado correctamente', severity: 'success' });
      fetchMensajes(selectedCliente);
    } catch (error: any) {
      console.error('Error al eliminar mensaje:', error.message);
      setSnackbar({ open: true, message: `Error al eliminar mensaje: ${error.message}`, severity: 'error' });
    } finally {
      setOpenDeleteDialog(null);
    }
  };

  // Format date for display
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

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: 4,
        mb: 4,
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05), rgba(0, 150, 136, 0.05))',
        borderRadius: 2,
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
        <FormControl fullWidth variant="outlined">
          <InputLabel id="cliente-select-label">Seleccionar Cliente</InputLabel>
          <Select
            labelId="cliente-select-label"
            id="cliente-select"
            value={selectedCliente}
            onChange={handleClienteChange}
            label="Seleccionar Cliente"
            aria-label="Seleccionar cliente"
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1,
              '& .MuiSelect-select': { py: 1.5 },
            }}
          >
            <MenuItem value="">
              <em>Seleccione un cliente</em>
            </MenuItem>
            {clientes.map((cliente) => (
              <MenuItem key={cliente.id} value={cliente.id}>
                {cliente.nombre} ({cliente.telefono})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedCliente && isValidUUID(selectedCliente) ? (
        <>
          {/* Message List */}
          <Paper
            elevation={3}
            sx={{
              p: 3,
              maxHeight: '50vh',
              overflow: 'auto',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            {loading ? (
              <Box sx={{ p: 2 }}>
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 2 }} />
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
                            borderRadius: 2,
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

          {/* Message Input */}
          <Paper
            elevation={3}
            sx={{ p: 3, mt: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <TextField
                fullWidth
                label="Escribe un mensaje"
                multiline
                rows={3}
                variant="outlined"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                aria-label="Escribe un mensaje"
                sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
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
                  disabled={!nuevoMensaje.trim() || !isValidUUID(selectedCliente)}
                  aria-label="Enviar mensaje"
                  sx={{
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  Enviar
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleRegistrarMensajeRecibido}
                  disabled={!nuevoMensaje.trim() || !isValidUUID(selectedCliente)}
                  aria-label="Registrar mensaje recibido"
                  sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                >
                  Registrar Recibido
                </Button>
              </Box>
            </Box>
          </Paper>
        </>
      ) : (
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Selecciona un cliente para ver y enviar mensajes
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenDialog}
            sx={{ mt: 2, borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
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
        PaperProps={{ sx: { borderRadius: 2, p: 2 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>Agregar Nuevo Cliente</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre"
            value={nuevoClienteNombre}
            onChange={(e) => setNuevoClienteNombre(e.target.value)}
            sx={{ mt: 2 }}
            aria-label="Nombre del cliente"
          />
          <TextField
            fullWidth
            label="Teléfono"
            value={nuevoClienteTelefono}
            onChange={(e) => setNuevoClienteTelefono(e.target.value)}
            sx={{ mt: 2 }}
            aria-label="Teléfono del cliente"
            inputProps={{ pattern: '[0-9]*' }}
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
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!openDeleteDialog}
        onClose={() => setOpenDeleteDialog(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}
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
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
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
          sx={{ width: '100%', borderRadius: 1, fontWeight: 500 }}
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