import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Button, TextField, Dialog, DialogActions,
  DialogContent, DialogTitle, Snackbar, Alert, List, ListItem,
  ListItemText, ListItemAvatar, Avatar, Divider, FormControl, InputLabel, Select,
  MenuItem, IconButton, Skeleton, InputAdornment, Fade, Checkbox, FormControlLabel,
  CircularProgress, Chip, useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Send as SendIcon, PersonAdd as PersonAddIcon, Delete as DeleteIcon, Schedule as ScheduleIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { es } from 'date-fns/locale';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

type Cliente = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  razon_social: string | null;
  created_by: string | null;
};

type Mensaje = {
  id: string;
  cliente_id: string;
  contenido: string;
  tipo: 'enviado' | 'recibido';
  created_at: string;
  created_by: string | null;
  file_url: string | null;
  cliente?: Cliente;
};

type ScheduledMessage = {
  id: string;
  cliente_id: string;
  contenido: string;
  scheduled_at: string;
  created_by: string | null;
  file_url: string | null;
  cliente?: Cliente;
};

const Mensajes = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [nuevoClienteRazonSocial, setNuevoClienteRazonSocial] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<string | null>(null);
  const [openDeleteScheduledDialog, setOpenDeleteScheduledDialog] = useState<string | null>(null);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showSentMessages, setShowSentMessages] = useState(false);
  const [showScheduledMessages, setShowScheduledMessages] = useState(false);

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
      fetchScheduledMessages();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (selectedClientes.length === 1 && showSentMessages) {
      fetchMensajes(selectedClientes[0]);
    } else {
      setMensajes([]);
      setLoading(false);
    }
    if (showScheduledMessages) {
      fetchScheduledMessages();
    } else {
      setScheduledMessages([]);
      setLoadingScheduled(false);
    }
  }, [selectedClientes, userRole, showSentMessages, showScheduledMessages]);

  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const fetchClientes = async () => {
    try {
      setLoading(true);
      if (!user) throw new Error('Usuario no autenticado');

      let query = supabase
        .from('clientes')
        .select('id, nombre, telefono, razon_social, created_by')
        .order('created_at', { ascending: false });

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

  const fetchMensajes = async (clienteId: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('mensajes')
        .select(`
          id,
          cliente_id,
          contenido,
          tipo,
          created_at,
          created_by,
          file_url,
          clientes!mensajes_cliente_id_fkey (id, nombre, telefono, razon_social, created_by)
        `)
        .eq('cliente_id', clienteId);

      if (userRole === 'cliente' && user) {
        query = query.eq('clientes.created_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      const mensajesMapped = data?.map((item) => ({
        id: item.id,
        cliente_id: item.cliente_id,
        contenido: item.contenido,
        tipo: item.tipo,
        created_at: item.created_at,
        created_by: item.created_by,
        file_url: item.file_url,
        cliente: Array.isArray(item.clientes) ? item.clientes[0] : item.clientes,
      })) || [];
      setMensajes(mensajesMapped);
    } catch (error: any) {
      console.error('Error al cargar mensajes:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para ver estos mensajes'
          : `Error al cargar mensajes: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledMessages = async () => {
    try {
      setLoadingScheduled(true);
      if (!user) throw new Error('Usuario no autenticado');

      let query = supabase
        .from('scheduled_messages')
        .select(`
          id,
          cliente_id,
          contenido,
          scheduled_at,
          created_by,
          file_url,
          clientes!scheduled_messages_cliente_id_fkey (id, nombre, telefono, razon_social, created_by)
        `)
        .order('scheduled_at', { ascending: true });

      if (userRole === 'cliente' && user) {
        query = query.eq('clientes.created_by', user.id);
      } else if (userRole === 'asesor') {
        query = query.eq('created_by', user.id);
      }

      if (selectedClientes.length === 1 && isValidUUID(selectedClientes[0])) {
        query = query.eq('cliente_id', selectedClientes[0]);
      } else if (selectedClientes.length > 1) {
        query = query.in('cliente_id', selectedClientes);
      }

      const { data, error } = await query;

      if (error) throw error;
      const scheduledMessagesMapped = data?.map((item) => ({
        id: item.id,
        cliente_id: item.cliente_id,
        contenido: item.contenido,
        scheduled_at: item.scheduled_at,
        created_by: item.created_by,
        file_url: item.file_url,
        cliente: Array.isArray(item.clientes) ? item.clientes[0] : item.clientes,
      })) || [];
      setScheduledMessages(scheduledMessagesMapped);
    } catch (error: any) {
      console.error('Error al cargar mensajes programados:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para ver estos mensajes programados'
          : `Error al cargar mensajes programados: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setLoadingScheduled(false);
    }
  };

  const handleClienteChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setSelectedClientes(value);
    setSelectAll(value.length === clientes.length && clientes.length > 0);
    setNuevoMensaje('');
    setSelectedFiles([]);
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSelectAll(checked);
    setSelectedClientes(checked ? clientes.map(c => c.id) : []);
    setNuevoMensaje('');
    setSelectedFiles([]);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const validFiles = Array.from(files).filter(file => 
        (file.type === 'application/pdf' || file.type.startsWith('image/')) && file.size <= 30 * 1024 * 1024 // 30MB max
      );
      if (validFiles.length > 1) {
        setSnackbar({ open: true, message: 'Solo se permite un archivo por mensaje', severity: 'error' });
        return;
      }
      if (validFiles.length < files.length) {
        setSnackbar({ open: true, message: 'Solo se permiten archivos PDF o imágenes de hasta 30MB', severity: 'warning' });
      }
      setSelectedFiles(validFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]) => {
    try {
      setUploadingFiles(true);
      if (files.length !== 1) {
        throw new Error('Solo se permite un archivo por mensaje');
      }
      const file = files[0];
      const fileName = `${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('message-files')
        .upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage
        .from('message-files')
        .getPublicUrl(fileName);
      if (!data?.publicUrl) {
        throw new Error('No se pudo obtener la URL pública del archivo');
      }
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error al cargar archivo:', error.message);
      setSnackbar({ open: true, message: `Error al cargar archivo: ${error.message}`, severity: 'error' });
      return null;
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleOpenDialog = () => {
    if (userRole === null) {
      setSnackbar({ open: true, message: 'No tienes permisos para realizar esta acción', severity: 'error' });
      return;
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNuevoClienteNombre('');
    setNuevoClienteTelefono('');
    setNuevoClienteRazonSocial('');
  };

  const handleAddCliente = async () => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    const telefonoRegex = /^\+?\d{9,15}$/;
    if (nuevoClienteTelefono && !telefonoRegex.test(nuevoClienteTelefono)) {
      setSnackbar({ open: true, message: 'Formato de teléfono inválido (9-15 dígitos, ej: +51987654321)', severity: 'error' });
      return;
    }

    try {
      const clienteData = {
        nombre: nuevoClienteNombre.trim() || null,
        telefono: nuevoClienteTelefono.trim() || null,
        razon_social: nuevoClienteRazonSocial.trim() || null,
        created_by: user.id,
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
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para agregar clientes'
          : `Error al agregar cliente: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const generatePersonalizedMessage = (cliente: Cliente, fileUrl: string | null = null) => {
    if (!cliente || !cliente.nombre) {
      const baseMessage = nuevoMensaje || 'Mensaje no personalizado';
      return fileUrl ? `${baseMessage}\nArchivo: ${fileUrl}` : baseMessage;
    }
    const nombre = cliente.nombre;
    const razonSocial = cliente.razon_social || 'su empresa';
    const baseMessage = `Hola, señor ${nombre}. 👋
Soy Luis Valle, representante comercial de EXCELSIUS, una empresa conformada por ingenieros full stack especializados en el desarrollo de software para distintos sectores de negocio.

En EXCELSIUS ayudamos a empresas como ${razonSocial} a optimizar su gestión, reducir costos, aumentar productividad, mejorar la toma de decisiones y crecer a través de soluciones tecnológicas personalizadas: desde sistemas ERP que integran procesos completos, hasta desarrollo de software a medida, aplicaciones móviles, inteligencia de negocios con Power BI y soluciones de e-commerce.

📅 Me gustaría coordinar una reunión breve para conocer sus necesidades específicas y mostrarle cómo podemos apoyarlos a potenciar la competitividad de ${razonSocial} con soluciones digitales a su medida.`;
    return fileUrl ? `${baseMessage}\nArchivo: ${fileUrl}` : baseMessage;
  };

  const handleGeneratePersonalizedMessage = async () => {
    if (selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0])) {
      setSnackbar({ open: true, message: 'Selecciona exactamente un cliente para personalizar el mensaje', severity: 'error' });
      return;
    }

    const cliente = clientes.find((c) => c.id === selectedClientes[0]);
    if (!cliente || !cliente.nombre) {
      setSnackbar({ open: true, message: 'El cliente seleccionado no tiene nombre registrado', severity: 'error' });
      return;
    }

    let fileUrl: string | null = null;
    if (selectedFiles.length > 0) {
      fileUrl = await uploadFiles(selectedFiles);
      if (!fileUrl) return;
    }

    const personalizedMessage = generatePersonalizedMessage(cliente, fileUrl);
    setNuevoMensaje(personalizedMessage);
    setSelectedFiles([]);
  };

  const handleEnviarMensaje = async () => {
    if (selectedClientes.length === 0 || (!nuevoMensaje.trim() && selectedFiles.length === 0)) {
      setSnackbar({ open: true, message: 'Selecciona al menos un cliente y escribe un mensaje o adjunta un archivo', severity: 'error' });
      return;
    }

    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (userRole === 'cliente' && selectedClientes.some(id => !clientes.find(c => c.id === id && c.created_by === user.id))) {
      setSnackbar({ open: true, message: 'No tienes permiso para enviar mensajes a estos clientes', severity: 'error' });
      return;
    }

    try {
      let fileUrl: string | null = null;
      if (selectedFiles.length > 0) {
        fileUrl = await uploadFiles(selectedFiles);
        if (!fileUrl) return;
      }

      for (const clienteId of selectedClientes.filter(id => isValidUUID(id))) {
        const cliente = clientes.find(c => c.id === clienteId);
        const contenido = cliente?.nombre && cliente?.razon_social 
          ? generatePersonalizedMessage(cliente, fileUrl)
          : nuevoMensaje + (fileUrl ? `\nArchivo: ${fileUrl}` : '');

        if (contenido.length > 1000) {
          setSnackbar({ open: true, message: 'El mensaje excede el límite de 1000 caracteres', severity: 'error' });
          return;
        }

        const { error } = await supabase.rpc('enviar_mensaje', {
          p_cliente_id: clienteId,
          p_contenido: contenido,
          p_file_url: fileUrl,
          p_user_id: user.id,
        });

        if (error) throw error;

        if (cliente?.telefono) {
          const formattedPhone = cliente.telefono.replace(/\D/g, '');
          window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(contenido)}`, '_blank');
        }
      }

      const clientsWithPhone = selectedClientes
        .map(id => clientes.find(c => c.id === id))
        .filter((c): c is Cliente => !!c && !!c.telefono);

      if (clientsWithPhone.length < selectedClientes.length) {
        setSnackbar({ 
          open: true, 
          message: `Mensajes registrados, pero algunos no se enviaron por WhatsApp (sin teléfono)`, 
          severity: 'warning' 
        });
      } else {
        setSnackbar({ open: true, message: `Mensajes enviados a ${selectedClientes.length} cliente(s)`, severity: 'success' });
      }

      setNuevoMensaje('');
      setSelectedFiles([]);
      if (selectedClientes.length === 1) {
        fetchMensajes(selectedClientes[0]);
      } else {
        setMensajes([]);
      }
    } catch (error: any) {
      console.error('Error al enviar mensajes:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para enviar mensajes a estos clientes'
          : `Error al enviar mensajes: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleScheduleMessage = async () => {
    if (selectedClientes.length === 0 || (!nuevoMensaje.trim() && selectedFiles.length === 0) || !scheduledDate) {
      setSnackbar({ open: true, message: 'Selecciona al menos un cliente, escribe un mensaje o adjunta un archivo, y selecciona una fecha/hora', severity: 'error' });
      return;
    }

    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (userRole === 'cliente') {
      setSnackbar({ open: true, message: 'Los clientes no pueden programar mensajes', severity: 'error' });
      return;
    }

    try {
      let fileUrl: string | null = null;
      if (selectedFiles.length > 0) {
        fileUrl = await uploadFiles(selectedFiles);
        if (!fileUrl) return;
      }

      const messagesToInsert = selectedClientes
        .filter(id => isValidUUID(id))
        .map(clienteId => {
          const cliente = clientes.find(c => c.id === clienteId);
          const contenido = cliente?.nombre && cliente?.razon_social 
            ? generatePersonalizedMessage(cliente, fileUrl)
            : nuevoMensaje + (fileUrl ? `\nArchivo: ${fileUrl}` : '');
          
          if (contenido.length > 1000) {
            throw new Error(`El mensaje para el cliente ${cliente?.nombre || clienteId} excede el límite de 1000 caracteres`);
          }

          return {
            cliente_id: clienteId,
            contenido,
            scheduled_at: scheduledDate.toISOString(),
            created_by: user.id,
            file_url: fileUrl,
          };
        });

      const { error } = await supabase
        .from('scheduled_messages')
        .insert(messagesToInsert);

      if (error) throw error;

      setNuevoMensaje('');
      setSelectedFiles([]);
      setScheduledDate(null);
      setOpenScheduleDialog(false);
      setSnackbar({ open: true, message: `Mensajes programados correctamente para ${selectedClientes.length} cliente(s)`, severity: 'success' });
      fetchScheduledMessages();
    } catch (error: any) {
      console.error('Error al programar mensajes:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para programar mensajes'
          : `Error al programar mensajes: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleDeleteScheduledMessage = async (id: string) => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (userRole === 'cliente') {
      setSnackbar({ open: true, message: 'Los clientes no pueden eliminar mensajes programados', severity: 'error' });
      return;
    }

    try {
      const mensaje = scheduledMessages.find(m => m.id === id);
      if (mensaje?.file_url) {
        const fileName = mensaje.file_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage.from('message-files').remove([fileName]);
          if (storageError && !storageError.message.includes('Object not found')) {
            throw storageError;
          }
        }
      }

      let query = supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (userRole !== 'administrador') {
        query = query.eq('created_by', user.id);
      }

      const { error } = await query;

      if (error) throw error;
      setSnackbar({ open: true, message: 'Mensaje programado eliminado correctamente', severity: 'success' });
      fetchScheduledMessages();
    } catch (error: any) {
      console.error('Error al eliminar mensaje programado:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para eliminar este mensaje programado'
          : `Error al eliminar mensaje programado: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setOpenDeleteScheduledDialog(null);
    }
  };

  const handleRegistrarMensajeRecibido = async () => {
    if (selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0]) || (!nuevoMensaje.trim() && selectedFiles.length === 0)) {
      setSnackbar({ open: true, message: 'Selecciona exactamente un cliente válido y escribe un mensaje o adjunta un archivo', severity: 'error' });
      return;
    }

    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (userRole === 'cliente' && !clientes.find(c => c.id === selectedClientes[0] && c.created_by === user.id)) {
      setSnackbar({ open: true, message: 'No tienes permiso para registrar mensajes para este cliente', severity: 'error' });
      return;
    }

    try {
      let fileUrl: string | null = null;
      if (selectedFiles.length > 0) {
        fileUrl = await uploadFiles(selectedFiles);
        if (!fileUrl) return;
      }

      const contenido = nuevoMensaje + (fileUrl ? `\nArchivo: ${fileUrl}` : '');
      if (contenido.length > 1000) {
        setSnackbar({ open: true, message: 'El mensaje excede el límite de 1000 caracteres', severity: 'error' });
        return;
      }

      const { error } = await supabase.rpc('registrar_mensaje_recibido', {
        p_cliente_id: selectedClientes[0],
        p_contenido: contenido,
        p_file_url: fileUrl,
        p_user_id: user.id,
      });

      if (error) throw error;

      setNuevoMensaje('');
      setSelectedFiles([]);
      setSnackbar({ open: true, message: 'Mensaje recibido registrado correctamente', severity: 'success' });
      fetchMensajes(selectedClientes[0]);
    } catch (error: any) {
      console.error('Error al registrar mensaje recibido:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para registrar mensajes'
          : `Error al registrar mensaje: ${error.message}`,
        severity: 'error',
      });
    }
  };

  const handleDeleteMensaje = async (id: string) => {
    if (!user) {
      setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
      return;
    }

    if (userRole === 'cliente') {
      setSnackbar({ open: true, message: 'Los clientes no pueden eliminar mensajes', severity: 'error' });
      return;
    }

    try {
      const mensaje = mensajes.find(m => m.id === id);
      if (mensaje?.file_url) {
        const fileName = mensaje.file_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage.from('message-files').remove([fileName]);
          if (storageError && !storageError.message.includes('Object not found')) {
            throw storageError;
          }
        }
      }

      let query = supabase
        .from('mensajes')
        .delete()
        .eq('id', id);

      if (userRole !== 'administrador') {
        query = query.eq('created_by', user.id);
      }

      const { error } = await query;

      if (error) throw error;
      setSnackbar({ open: true, message: 'Mensaje eliminado correctamente', severity: 'success' });
      fetchMensajes(selectedClientes[0]);
    } catch (error: any) {
      console.error('Error al eliminar mensaje:', error.message);
      setSnackbar({
        open: true,
        message: error.message.includes('violates row-level security policy')
          ? 'No tienes permiso para eliminar este mensaje'
          : `Error al eliminar mensaje: ${error.message}`,
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
        p: { xs: 2, sm: 3, md: 4 },
        borderRadius: 2,
        boxShadow: theme.shadows[3],
        backgroundImage: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05), rgba(0, 150, 136, 0.05))',
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: 'primary.main',
          mb: { xs: 3, sm: 4 },
          textAlign: { xs: 'center', sm: 'left' },
        }}
      >
        Mensajes
      </Typography>

      <Grid container spacing={3}>
        {/* Client Selection and Scheduled Messages */}
        <Grid size={12}>
          <Grid container spacing={3}>
            {/* Client Selection */}
            <Grid size={12}>
              <Paper
                sx={{
                  p: { xs: 2, sm: 3 },
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: theme.shadows[2],
                  transition: 'box-shadow 0.2s ease-in-out',
                  '&:hover': { boxShadow: theme.shadows[4] },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}
                >
                  Selección de Clientes
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectAll}
                      onChange={handleSelectAllChange}
                      color="primary"
                      aria-label="Seleccionar todos los clientes"
                      disabled={userRole === null || clientes.length === 0}
                    />
                  }
                  label="Seleccionar todos los clientes"
                  sx={{ mb: 2, fontWeight: 500 }}
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
                      borderRadius: 2,
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
                  <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    No se encontraron clientes. Agrega un nuevo cliente para comenzar.
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PersonAddIcon />}
                    onClick={handleOpenDialog}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      '&:hover': { transform: 'translateY(-1px)' },
                    }}
                    aria-label="Agregar nuevo cliente"
                    disabled={userRole === null}
                  >
                    Agregar Cliente
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={() => setShowSentMessages(!showSentMessages)}
                    disabled={selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0])}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      bgcolor: showSentMessages ? 'primary.dark' : 'primary.main',
                      '&:hover': { bgcolor: 'primary.dark', transform: 'translateY(-1px)' },
                    }}
                    aria-label={showSentMessages ? 'Ocultar mensajes enviados' : 'Ver mensajes enviados'}
                  >
                    {showSentMessages ? 'Ocultar Mensajes Enviados' : 'Ver Mensajes Enviados'}
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<ScheduleIcon />}
                    onClick={() => setShowScheduledMessages(!showScheduledMessages)}
                    disabled={selectedClientes.length === 0}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      bgcolor: showScheduledMessages ? 'warning.dark' : 'warning.main',
                      '&:hover': { bgcolor: 'warning.dark', transform: 'translateY(-1px)' },
                    }}
                    aria-label={showScheduledMessages ? 'Ocultar mensajes programados' : 'Ver mensajes programados'}
                  >
                    {showScheduledMessages ? 'Ocultar Mensajes Programados' : 'Ver Mensajes Programados'}
                  </Button>
                </Box>
              </Paper>
            </Grid>
            {/* Scheduled Messages */}
            <Grid size={12}>
              {showScheduledMessages && (
                <Paper
                  sx={{
                    p: { xs: 2, sm: 3 },
                    maxHeight: { xs: '40vh', sm: '50vh' },
                    overflow: 'auto',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: theme.shadows[2],
                    transition: 'box-shadow 0.2s ease-in-out',
                    '&:hover': { boxShadow: theme.shadows[4] },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}
                  >
                    Mensajes Programados
                  </Typography>
                  {loadingScheduled ? (
                    <Box sx={{ p: 2 }}>
                      {[...Array(3)].map((_, index) => (
                        <Skeleton key={index} variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 1 }} />
                      ))}
                    </Box>
                  ) : scheduledMessages.length > 0 ? (
                    <List>
                      {scheduledMessages.map((mensaje, index) => (
                        <Fade key={mensaje.id} in>
                          <Box>
                            {index > 0 && <Divider variant="inset" component="li" />}
                            <ListItem
                              alignItems="flex-start"
                              sx={{
                                py: 1.5,
                                '& .MuiListItemText-root': {
                                  maxWidth: { xs: '85%', sm: '70%' },
                                },
                              }}
                              secondaryAction={
                                <IconButton
                                  edge="end"
                                  aria-label={`Eliminar mensaje programado ${mensaje.contenido.slice(0, 20)}...`}
                                  onClick={() => setOpenDeleteScheduledDialog(mensaje.id)}
                                  sx={{ color: 'error.main' }}
                                  disabled={userRole === 'cliente' || (userRole === 'asesor' && (!user || mensaje.created_by !== user.id))}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              }
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>
                                  <ScheduleIcon fontSize="small" />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {mensaje.cliente?.nombre || `Cliente ${mensaje.cliente_id.slice(0, 8)}...`}
                                      </Typography>
                                      <Chip
                                        label="Programado"
                                        size="small"
                                        color="warning"
                                        sx={{ fontWeight: 500 }}
                                      />
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                      {mensaje.contenido.length > 100 ? `${mensaje.contenido.slice(0, 100)}...` : mensaje.contenido}
                                    </Typography>
                                    {mensaje.file_url && (
                                      <Box sx={{ mt: 1 }}>
                                        <a href={mensaje.file_url} target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.primary.main, fontSize: '0.9rem' }}>
                                          {mensaje.file_url.endsWith('.pdf') ? 'Ver PDF' : 'Ver Imagen'}
                                        </a>
                                      </Box>
                                    )}
                                  </>
                                }
                                secondary={`Programado para: ${formatDate(mensaje.scheduled_at)}`}
                                sx={{
                                  bgcolor: 'grey.100',
                                  p: 2,
                                  borderRadius: 2,
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                  transition: 'transform 0.2s ease',
                                  '&:hover': { transform: 'scale(1.02)' },
                                }}
                              />
                            </ListItem>
                          </Box>
                        </Fade>
                      ))}
                    </List>
                  ) : (
                    <Typography align="center" color="text.secondary" sx={{ p: 2 }}>
                      No hay mensajes programados
                    </Typography>
                  )}
                </Paper>
              )}
            </Grid>
          </Grid>
        </Grid>

        {/* Sent Messages */}
        {showSentMessages && selectedClientes.length === 1 && isValidUUID(selectedClientes[0]) && (
          <Grid size={12}>
            <Paper
              sx={{
                p: { xs: 2, sm: 3 },
                maxHeight: { xs: '40vh', sm: '50vh' },
                overflow: 'auto',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: theme.shadows[2],
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': { boxShadow: theme.shadows[4] },
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}
              >
                Conversación
              </Typography>
              {loading ? (
                <Box sx={{ p: 2 }}>
                  {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} variant="rectangular" height={80} sx={{ mb: 2, borderRadius: 1 }} />
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
                              maxWidth: { xs: '85%', sm: '70%' },
                            },
                          }}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              aria-label={`Eliminar mensaje ${mensaje.contenido.slice(0, 20)}...`}
                              onClick={() => setOpenDeleteDialog(mensaje.id)}
                              sx={{ color: 'error.main' }}
                              disabled={userRole === 'cliente' || (userRole === 'asesor' && (!user || mensaje.created_by !== user.id))}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          {mensaje.tipo === 'recibido' && (
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                {mensaje.cliente?.nombre?.charAt(0) || '?'}
                              </Avatar>
                            </ListItemAvatar>
                          )}
                          <ListItemText
                            primary={
                              <>
                                {mensaje.contenido}
                                {mensaje.file_url && (
                                  <Box sx={{ mt: 1 }}>
                                    <a href={mensaje.file_url} target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.primary.main, fontSize: '0.9rem' }}>
                                      {mensaje.file_url.endsWith('.pdf') ? 'Ver PDF' : 'Ver Imagen'}
                                    </a>
                                  </Box>
                                )}
                              </>
                            }
                            secondary={formatDate(mensaje.created_at)}
                            sx={{
                              bgcolor: mensaje.tipo === 'enviado' ? 'primary.light' : 'grey.100',
                              p: 2,
                              borderRadius: 2,
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              transition: 'transform 0.2s ease',
                              '&:hover': { transform: 'scale(1.02)' },
                            }}
                          />
                          {mensaje.tipo === 'enviado' && (
                            <ListItemAvatar sx={{ ml: 2 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>Yo</Avatar>
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
          </Grid>
        )}

        {/* Message Input */}
        {selectedClientes.length > 0 && (
          <Grid size={12}>
            <Paper
              sx={{
                p: { xs: 2, sm: 3 },
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: theme.shadows[2],
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': { boxShadow: theme.shadows[4] },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Escribe un mensaje"
                  multiline
                  rows={3}
                  variant="outlined"
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  aria-label="Escribe un mensaje"
                  sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography variant="caption" color="text.secondary">
                          {nuevoMensaje.length}/1000
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ maxLength: 1000 }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    disabled={uploadingFiles || selectedFiles.length > 0}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                    aria-label="Adjuntar archivo"
                  >
                    Adjuntar archivo
                    <input
                      type="file"
                      hidden
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                    />
                  </Button>
                  {uploadingFiles && <CircularProgress size={24} />}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedFiles.map((file, index) => (
                      <Chip
                        key={index}
                        label={file.name}
                        onDelete={() => handleRemoveFile(index)}
                        sx={{ bgcolor: 'grey.200', fontWeight: 500 }}
                      />
                    ))}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  <Button
                    variant="contained"
                    color="primary"
                    endIcon={<SendIcon />}
                    onClick={handleEnviarMensaje}
                    disabled={(!nuevoMensaje.trim() && selectedFiles.length === 0) || selectedClientes.length === 0 || uploadingFiles}
                    aria-label="Enviar mensaje"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      '&:hover': { transform: 'translateY(-1px)' },
                    }}
                  >
                    Enviar
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleRegistrarMensajeRecibido}
                    disabled={(!nuevoMensaje.trim() && selectedFiles.length === 0) || selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0]) || uploadingFiles}
                    aria-label="Registrar mensaje recibido"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                    }}
                  >
                    Registrar Recibido
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGeneratePersonalizedMessage}
                    disabled={selectedClientes.length !== 1 || !isValidUUID(selectedClientes[0]) || uploadingFiles}
                    aria-label="Ingresar mensaje personalizado"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      py: 1,
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
                    disabled={(!nuevoMensaje.trim() && selectedFiles.length === 0) || selectedClientes.length === 0 || uploadingFiles || userRole === 'cliente'}
                    aria-label="Programar mensaje"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                    }}
                  >
                    Programar
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Placeholder when no clients are selected */}
        {selectedClientes.length === 0 && (
          <Grid size={12}>
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: theme.shadows[2],
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': { boxShadow: theme.shadows[4] },
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
                sx={{
                  mt: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                }}
                aria-label="Agregar nuevo cliente"
                disabled={userRole === null}
              >
                Agregar Nuevo Cliente
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Add Client Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        PaperProps={{ sx: { p: 2, borderRadius: 2, maxWidth: 500 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>Agregar Nuevo Cliente</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre (opcional)"
            value={nuevoClienteNombre}
            onChange={(e) => setNuevoClienteNombre(e.target.value)}
            sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            aria-label="Nombre del cliente"
            inputProps={{ maxLength: 255 }}
          />
          <TextField
            fullWidth
            label="Teléfono (opcional)"
            value={nuevoClienteTelefono}
            onChange={(e) => setNuevoClienteTelefono(e.target.value)}
            sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            aria-label="Teléfono del cliente"
            inputProps={{ maxLength: 15 }}
            helperText="Incluye el código de país, 9-15 dígitos (ej: +51987654321)"
          />
          <TextField
            fullWidth
            label="Razón Social (opcional)"
            value={nuevoClienteRazonSocial}
            onChange={(e) => setNuevoClienteRazonSocial(e.target.value)}
            sx={{ mt: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            aria-label="Razón social del cliente"
            inputProps={{ maxLength: 255 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            color="inherit"
            aria-label="Cancelar"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAddCliente}
            variant="contained"
            color="primary"
            aria-label="Agregar cliente"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Message Dialog */}
      <Dialog
        open={openScheduleDialog}
        onClose={() => setOpenScheduleDialog(false)}
        PaperProps={{ sx: { p: 2, borderRadius: 2, maxWidth: 500 } }}
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
              sx={{ mt: 2, width: '100%', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              slotProps={{
                textField: { variant: 'outlined', 'aria-label': 'Seleccionar fecha y hora' },
              }}
            />
          </LocalizationProvider>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Selecciona la fecha y hora en la que deseas que se envíe el mensaje a {selectedClientes.length} cliente(s).
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenScheduleDialog(false)}
            color="inherit"
            aria-label="Cancelar"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleScheduleMessage}
            variant="contained"
            color="primary"
            disabled={!scheduledDate || (!nuevoMensaje.trim() && selectedFiles.length === 0)}
            aria-label="Programar mensaje"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Programar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Message Dialog */}
      <Dialog
        open={!!openDeleteDialog}
        onClose={() => setOpenDeleteDialog(null)}
        PaperProps={{ sx: { p: 2, borderRadius: 2, maxWidth: 500 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar este mensaje?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenDeleteDialog(null)}
            color="inherit"
            aria-label="Cancelar"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => openDeleteDialog && handleDeleteMensaje(openDeleteDialog)}
            variant="contained"
            color="error"
            aria-label="Eliminar mensaje"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Scheduled Message Dialog */}
      <Dialog
        open={!!openDeleteScheduledDialog}
        onClose={() => setOpenDeleteScheduledDialog(null)}
        PaperProps={{ sx: { p: 2, borderRadius: 2, maxWidth: 500 } }}
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro de que deseas eliminar este mensaje programado?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenDeleteScheduledDialog(null)}
            color="inherit"
            aria-label="Cancelar"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => openDeleteScheduledDialog && handleDeleteScheduledMessage(openDeleteScheduledDialog)}
            variant="contained"
            color="error"
            aria-label="Eliminar mensaje programado"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
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
          sx={{ width: '100%', fontWeight: 500, borderRadius: 2 }}
          iconMapping={{
            success: <SendIcon fontSize="inherit" />,
            error: <DeleteIcon fontSize="inherit" />,
            warning: <AttachFileIcon fontSize="inherit" />,
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Mensajes;