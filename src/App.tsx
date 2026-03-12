/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Mail,
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  XCircle, 
  Copy, 
  Trash2, 
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  Home,
  Check,
  X,
  Phone,
  MessageSquare,
  MessageCircle,
  Download,
  Upload,
  CalendarRange,
  Database,
  RefreshCw,
  Send,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Appointment, ExamType, Ticket, TicketStatus, TicketType } from './types';
import { supabase } from './lib/supabase';
import { Ticket as TicketIcon, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { maskCPF, maskPhone, getSubject, generateRequestText, generateStudentText, validateCPF, validateRenach, normalizeString } from './utils/helpers';
import { FormLabel, Checkbox, DetailItem, StatusBadge, StatCard } from './components/UIComponents';
import { HomeView } from './components/HomeView';

// Helper for masks
// Removed local helpers, using src/utils/helpers.ts

export default function App() {
  // Load from localStorage on init
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('detran_appointments');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'confirmed' | 'unconfirmed' | 'expired' | 'sga_crt'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');
  const [currentView, setCurrentView] = useState<'home' | 'appointments' | 'tickets'>('home');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingTickets, setIsFetchingTickets] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    const now = new Date();
    // Use local date parts to avoid UTC shift issues
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Form State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFirstSync, setIsFirstSync] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    cpf: '',
    renach: '',
    appointmentDate: '',
    location: '',
    contact: '',
    isFitVision: false,
    isFitPsychologist: false,
    isFitH572C: false,
    isFitCP02A: false,
    isFitLegislation: false,
    hasSgaCrtCall: false,
    isConfirmed: false,
    isRequestSent: false,
    result: null as 'APTO' | 'INAPTO' | null,
    observations: '',
    appointmentTime: '',
    serviceType: '151 – 1ª Habilitação Veicular (2 e 4 rodas)',
    category: 'AB',
    examType: 'Legislação' as ExamType
  });

  const [ticketFormData, setTicketFormData] = useState({
    studentName: '',
    studentCpf: '',
    studentRenach: '',
    type: 'SGA' as TicketType,
    status: 'Aberto' as TicketStatus,
    description: '',
    observations: '',
    appointmentId: ''
  });

  const fetchTickets = async (silent = false) => {
    if (!supabase) return;
    if (isFetchingTickets) return;
    setIsFetchingTickets(true);
    if (!silent) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        // Handle missing table error gracefully
        if (error.code === 'PGRST205') {
          console.warn('Tabela "tickets" não encontrada no Supabase. Os chamados SGA/CRT funcionarão apenas localmente até que a tabela seja criada.');
          return;
        }
        throw error;
      }
      
      const saved = localStorage.getItem('detran_tickets');
      const localTickets: Ticket[] = saved ? JSON.parse(saved) : [];

      if (data && data.length > 0) {
        // Merge: remote data wins on conflict (by ID), but keep local-only items
        const remoteIds = new Set(data.map(t => t.id));
        const localOnly = localTickets.filter(t => !remoteIds.has(t.id));
        
        // Sync local-only items to Supabase
        if (localOnly.length > 0) {
          console.log(`Syncing ${localOnly.length} local-only tickets to Supabase...`);
          try {
            const { error: syncError } = await supabase.from('tickets').upsert(localOnly);
            if (syncError) console.error('Error syncing local tickets to Supabase:', syncError);
          } catch (e) {
            console.error('Exception syncing local tickets:', e);
          }
        }

        const merged = [...data, ...localOnly].sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setTickets(merged);
      } else if (localTickets.length > 0) {
        // No tickets in Supabase, push local ones
        console.log(`Pushing all ${localTickets.length} local tickets to empty Supabase...`);
        try {
          const { error: syncError } = await supabase.from('tickets').upsert(localTickets);
          if (syncError) console.error('Error pushing local tickets to Supabase:', syncError);
        } catch (e) {
          console.error('Exception pushing local tickets:', e);
        }
        setTickets(localTickets);
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message === 'Falha ao buscar')) {
        console.warn('Erro de rede ao buscar chamados. Verifique sua conexão ou se algum bloqueador de anúncios está impedindo o acesso ao Supabase.');
      }
    } finally {
      setIsFetchingTickets(false);
      if (!silent) setIsLoading(false);
    }
  };

  const cleanupDuplicates = async (data: Appointment[]) => {
    if (!data || data.length === 0) return data;
    
    const seen = new Map<string, Appointment>();
    const toDelete: string[] = [];
    const unique: Appointment[] = [];

    // Sort by updatedAt descending so we keep the most recent one
    const sorted = [...data].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    for (const app of sorted) {
      // Key: Name + CPF + RENACH + ExamType (normalized)
      // We use a combination to be sure it's the same person
      const nameKey = app.fullName.trim().toLowerCase();
      const cpfKey = app.cpf.trim();
      const renachKey = app.renach.trim().toUpperCase();
      const examKey = app.examType;
      
      // Check if any of the identifying fields (if not empty) already exist for this exam type
      let isDuplicate = false;
      
      // We'll use a more complex check: if any record with same (Name OR CPF OR RENACH) AND same ExamType exists
      // But for simplicity in a Map, we'll just check if we've seen this person+exam before
      // We'll use multiple keys to track
      const personKey = `${nameKey}|${cpfKey}|${renachKey}|${examKey}`;
      
      // Check if any existing unique record has same CPF or RENACH for same exam
      // We don't use Name alone as it can have homonyms
      if (seen.has(personKey)) {
        isDuplicate = true;
      } else {
        const existingDuplicate = unique.find(u => 
          u.examType === examKey && 
          (
            (u.cpf.trim() === cpfKey && cpfKey !== '' && cpfKey !== '000.000.000-00') || 
            (u.renach.trim().toUpperCase() === renachKey && renachKey !== '' && renachKey !== 'BA000000000')
          )
        );
        if (existingDuplicate) isDuplicate = true;
      }

      if (isDuplicate) {
        toDelete.push(app.id);
      } else {
        seen.set(personKey, app);
        unique.push(app);
      }
    }

    if (toDelete.length > 0) {
      console.log(`Cleaning up ${toDelete.length} duplicates...`);
      if (supabase) {
        try {
          // Delete from Supabase
          const { error } = await supabase.from('appointments').delete().in('id', toDelete);
          if (error) console.error('Error deleting duplicates from Supabase:', error);
        } catch (e) {
          console.error('Exception deleting duplicates:', e);
        }
      }
      setAppointments(unique);
      setNotification({ message: `${toDelete.length} registros duplicados foram removidos automaticamente para manter a integridade do sistema.`, type: 'info' });
    }
    return unique;
  };

  const saveCloudBackup = async () => {
    if (!supabase) return;
    try {
      const backupData = {
        appointments,
        tickets,
        version: '1.0',
        exportDate: new Date().toISOString()
      };
      
      const { error } = await supabase.from('backups').insert({ data: backupData });
      if (error) throw error;
      
      setNotification({ message: 'Backup salvo na nuvem com sucesso!', type: 'success' });
    } catch (error) {
      console.error('Error saving cloud backup:', error);
      setNotification({ message: 'Erro ao salvar backup na nuvem.', type: 'error' });
    }
  };

  const fetchData = async (silent = false) => {
    if (isFetching) return;
    setIsFetching(true);
    if (!silent) setIsLoading(true);
    try {
      if (!supabase) {
        setDbStatus('disconnected');
        setNotification({ 
          message: 'Supabase não configurado. As alterações serão salvas apenas localmente.', 
          type: 'error' 
        });
        const saved = localStorage.getItem('detran_appointments');
        if (saved) setAppointments(JSON.parse(saved));
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('updatedAt', { ascending: false });

      if (error) throw error;

      setDbStatus('connected');
      
      const saved = localStorage.getItem('detran_appointments');
      const localData: Appointment[] = saved ? JSON.parse(saved) : [];
      
      if (data && data.length > 0) {
        // If local storage is empty, this is likely a new machine
        if (localData.length === 0) {
          setIsFirstSync(true);
          setTimeout(() => setIsFirstSync(false), 3000);
        }

        // Merge: remote data wins on conflict (by ID), but keep local-only items
        const remoteIds = new Set(data.map(a => a.id));
        const localOnly = localData.filter(a => !remoteIds.has(a.id));
        
        // Sync local-only items to Supabase if they are new
        if (localOnly.length > 0) {
          console.log(`Syncing ${localOnly.length} local-only items to Supabase...`);
          try {
            const { error: syncError } = await supabase.from('appointments').upsert(localOnly);
            if (syncError) console.error('Error syncing local items to Supabase:', syncError);
          } catch (e) {
            console.error('Exception syncing local items:', e);
          }
        }

        const merged = [...data, ...localOnly].sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        await cleanupDuplicates(merged);
      } else if (localData.length > 0) {
        // No data in Supabase, but we have local data - push it all
        console.log(`Pushing all ${localData.length} local items to empty Supabase...`);
        try {
          const { error: syncError } = await supabase.from('appointments').upsert(localData);
          if (syncError) console.error('Error pushing local items to Supabase:', syncError);
        } catch (e) {
          console.error('Exception pushing local items:', e);
        }
        await cleanupDuplicates(localData);
      }

      // Also fetch tickets
      await fetchTickets(silent);
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error: any) {
      console.error('Error fetching from Supabase:', error);
      setDbStatus('error');
      
      let errorMsg = 'Erro ao conectar com Supabase.';
      
      if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message === 'Falha ao buscar')) {
        errorMsg = 'Falha na conexão com o banco de dados. Verifique sua internet ou desative bloqueadores de anúncios (AdBlock) que podem estar impedindo o acesso ao Supabase.';
      } else if (error?.message?.includes('relation "appointments" does not exist')) {
        errorMsg = 'Tabela "appointments" não encontrada no Supabase.';
      } else if (error?.message?.includes('column "result" of relation "appointments" does not exist')) {
        errorMsg = 'Coluna "result" faltando na tabela "appointments". Verifique o SQL no arquivo supabase.ts.';
      }
      
      setNotification({ message: errorMsg, type: 'error' });
      
      const saved = localStorage.getItem('detran_appointments');
      if (saved) setAppointments(JSON.parse(saved));
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  };

  // Load from Supabase or localStorage
  useEffect(() => {
    fetchData();
    
    // Refresh on window focus
    const handleFocus = () => {
      console.log('Window focused, refreshing data...');
      fetchData(true);
    };
    window.addEventListener('focus', handleFocus);
    
    // Set up Realtime subscriptions
    if (supabase) {
      const appointmentsChannel = supabase
        .channel('appointments-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
          console.log('Realtime update: appointments');
          fetchData(true); // Silent refetch
        })
        .subscribe((status) => {
          console.log(`Realtime status (appointments): ${status}`);
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime connection error for appointments. Check if Realtime is enabled for this table in Supabase dashboard.');
          }
        });

      const ticketsChannel = supabase
        .channel('tickets-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
          console.log('Realtime update: tickets');
          fetchTickets(true); // Silent refetch
        })
        .subscribe((status) => {
          console.log(`Realtime status (tickets): ${status}`);
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime connection error for tickets. Check if Realtime is enabled for this table in Supabase dashboard.');
          }
        });

      return () => {
        window.removeEventListener('focus', handleFocus);
        supabase.removeChannel(appointmentsChannel);
        supabase.removeChannel(ticketsChannel);
      };
    }
  }, []);

  // Save to localStorage as backup
  useEffect(() => {
    localStorage.setItem('detran_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('detran_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Check for unconfirmed appointments today
  useEffect(() => {
    const unconfirmedTodayCount = appointments.filter(app => app.appointmentDate === todayStr && !app.isConfirmed).length;
    
    if (unconfirmedTodayCount > 0) {
      setNotification({
        message: `Atenção: ${unconfirmedTodayCount} agendamento(s) para hoje não foram confirmados. Solicite uma nova data.`,
        type: 'error'
      });
    }
  }, [appointments.length, todayStr]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmados = appointments.filter(app => app.isConfirmed).length;
    const naoConfirmados = appointments.filter(app => !app.isConfirmed).length;
    const vencidos = appointments.filter(app => app.appointmentDate < todayStr && !app.isConfirmed).length;
    const sgaCrt = appointments.filter(app => app.hasSgaCrtCall).length;
    return { total, confirmados, naoConfirmados, vencidos, sgaCrt };
  }, [appointments, todayStr]);

  const unconfirmedToday = useMemo(() => {
    return appointments.filter(app => app.appointmentDate === todayStr && !app.isConfirmed);
  }, [appointments, todayStr]);

  const appointmentsByDate = useMemo(() => {
    const groups: Record<string, { date: string, count: number, confirmed: number }> = {};
    
    appointments.forEach(app => {
      if (!groups[app.appointmentDate]) {
        groups[app.appointmentDate] = { date: app.appointmentDate, count: 0, confirmed: 0 };
      }
      groups[app.appointmentDate].count++;
      if (app.isConfirmed) groups[app.appointmentDate].confirmed++;
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    
    return appointments.filter(app => {
      // Search filter
      const matchesSearch = normalizeString(app.fullName).includes(normalizedSearch) ||
        app.cpf.replace(/\D/g, '').includes(normalizedSearch) ||
        normalizeString(app.renach).includes(normalizedSearch);
      
      if (!matchesSearch) return false;

      // Category filter
      if (activeFilter === 'confirmed') return app.isConfirmed;
      if (activeFilter === 'unconfirmed') return !app.isConfirmed;
      if (activeFilter === 'expired') {
        return app.appointmentDate < todayStr && !app.isConfirmed;
      }
      if (activeFilter === 'sga_crt') return app.hasSgaCrtCall;
      
      return true;
    }).sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.fullName.localeCompare(b.fullName);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [appointments, searchTerm, activeFilter, todayStr, sortBy]);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    
    return tickets.filter(ticket => {
      return normalizeString(ticket.studentName).includes(normalizedSearch) ||
        ticket.studentCpf.replace(/\D/g, '').includes(normalizedSearch) ||
        normalizeString(ticket.studentRenach).includes(normalizedSearch) ||
        normalizeString(ticket.description).includes(normalizedSearch);
    });
  }, [tickets, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      let maskedValue = value;
      if (name === 'cpf') maskedValue = maskCPF(value);
      if (name === 'contact') maskedValue = maskPhone(value);
      setFormData(prev => ({ ...prev, [name]: maskedValue }));
    }
  };

  const sendEmail = async (app: Appointment) => {
    const detranEmail = 'agendamento.crt@detran.ba.gov.br';
    const subject = encodeURIComponent(getSubject(app));
    const body = encodeURIComponent(generateRequestText(app));
    
    // Outlook Web Deep Link
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${detranEmail}&subject=${subject}&body=${body}`;
    window.open(outlookUrl, '_blank');

    // Mark as request sent
    if (!app.isRequestSent) {
      const now = new Date().toISOString();
      const updatedApp = { ...app, isRequestSent: true, updatedAt: now };
      
      // Update local state
      setAppointments(prev => prev.map(a => a.id === app.id ? updatedApp : a));
      if (selectedAppointment?.id === app.id) setSelectedAppointment(updatedApp);
      
      // Sync to Supabase
      if (supabase) {
        try {
          const { error } = await supabase.from('appointments').upsert(updatedApp);
          if (error) throw error;
        } catch (e) {
          console.error('Error syncing request sent status:', e);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCPF(formData.cpf)) {
      setNotification({ message: 'CPF inválido. Deve conter 11 dígitos.', type: 'error' });
      return;
    }

    if (!validateRenach(formData.renach)) {
      setNotification({ message: 'RENACH inválido. Verifique o número informado.', type: 'error' });
      return;
    }

    // Check for duplicate Name, CPF or RENACH for the same exam type
    const duplicate = appointments.find(app => 
      (
        (app.cpf.trim() === formData.cpf.trim() && formData.cpf.trim() !== '') || 
        (app.renach.trim().toUpperCase() === formData.renach.trim().toUpperCase() && formData.renach.trim() !== '') ||
        (app.fullName.trim().toLowerCase() === formData.fullName.trim().toLowerCase() && formData.fullName.trim() !== '')
      ) && 
      app.examType === formData.examType && 
      app.id !== editingId
    );

    if (duplicate) {
      let field = 'registro';
      if (duplicate.cpf.trim() === formData.cpf.trim()) field = 'CPF';
      else if (duplicate.renach.trim().toUpperCase() === formData.renach.trim().toUpperCase()) field = 'RENACH';
      else if (duplicate.fullName.trim().toLowerCase() === formData.fullName.trim().toLowerCase()) field = 'Nome';

      setNotification({
        message: `Este ${field} já possui um agendamento de ${formData.examType} para ${duplicate.fullName}.`,
        type: 'error'
      });
      return;
    }
    
    const now = new Date().toISOString();
    let supabaseError = null;
    
    // Generate a robust ID
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch (e) {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
      }
    };

    const appointmentToSave: Appointment = {
      ...formData,
      fullName: formData.fullName.trim(),
      cpf: formData.cpf.trim(),
      renach: formData.renach.trim().toUpperCase(),
      location: formData.location.trim(),
      contact: formData.contact.trim(),
      id: editingId || generateId(),
      createdAt: editingId ? (appointments.find(a => a.id === editingId)?.createdAt || now) : now,
      updatedAt: now
    };

    try {
      if (supabase) {
        // Clean data to avoid sending undefined values which Supabase might reject
        const cleanData = Object.fromEntries(
          Object.entries(appointmentToSave).filter(([_, v]) => v !== undefined)
        );

        const { error } = await supabase
          .from('appointments')
          .upsert(cleanData);

        if (error) {
          console.error('Supabase upsert error:', error);
          supabaseError = error;
        }
      }

      // Always update local state regardless of Supabase success (Optimistic/Fallback)
      let finalMsg = 'Agendamento cadastrado com sucesso!';
      let finalType: 'success' | 'warning' = 'success';
      
      if (supabaseError) {
        finalMsg = `Aviso: Salvo apenas localmente. Erro no banco: ${supabaseError.message}`;
        finalType = 'warning';
      }

      if (editingId) {
        setAppointments(prev => [appointmentToSave, ...prev.filter(app => app.id !== editingId)]);
        setNotification({ 
          message: editingId ? 'Agendamento atualizado com sucesso!' : finalMsg, 
          type: editingId ? 'success' : finalType 
        });
        if (selectedAppointment?.id === editingId) {
          setSelectedAppointment(appointmentToSave);
        }
        setEditingId(null);
      } else {
        setAppointments(prev => [appointmentToSave, ...prev]);
        setNotification({ message: finalMsg, type: finalType });
      }
      
      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Critical error in handleSubmit:', error);
      setNotification({ 
        message: `Erro crítico ao salvar: ${error.message || 'Erro desconhecido'}. Tentando salvar localmente...`, 
        type: 'error' 
      });
      
      // Final fallback to local state
      if (editingId) {
        setAppointments(prev => [appointmentToSave, ...prev.filter(app => app.id !== editingId)]);
      } else {
        setAppointments(prev => [appointmentToSave, ...prev]);
      }
      setIsFormOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      cpf: '',
      renach: '',
      appointmentDate: '',
      location: '',
      contact: '',
      isFitVision: false,
      isFitPsychologist: false,
      isFitH572C: false,
      isFitCP02A: false,
      isFitLegislation: false,
      hasSgaCrtCall: false,
      isConfirmed: false,
      isRequestSent: false,
      result: null,
      observations: '',
      appointmentTime: '',
      serviceType: '151 – 1ª Habilitação Veicular (2 e 4 rodas)',
      category: 'AB',
      examType: 'Legislação'
    });
    setEditingId(null);
  };

  const handleEdit = (app: Appointment) => {
    setFormData({
      fullName: app.fullName,
      cpf: app.cpf,
      renach: app.renach,
      appointmentDate: app.appointmentDate,
      location: app.location,
      contact: app.contact || '',
      isFitVision: app.isFitVision,
      isFitPsychologist: app.isFitPsychologist,
      isFitH572C: app.isFitH572C,
      isFitCP02A: app.isFitCP02A,
      isFitLegislation: app.isFitLegislation || false,
      hasSgaCrtCall: app.hasSgaCrtCall || false,
      isConfirmed: app.isConfirmed || false,
      isRequestSent: app.isRequestSent || false,
      result: app.result || null,
      observations: app.observations || '',
      appointmentTime: app.appointmentTime || '',
      serviceType: app.serviceType || '151 – 1ª Habilitação Veicular (2 e 4 rodas)',
      category: app.category || 'AB',
      examType: app.examType
    });
    setEditingId(app.id);
    setIsFormOpen(true);
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const deleteAppointment = async (e: React.MouseEvent, appToDelete: Appointment | null) => {
    e.stopPropagation();
    if (!appToDelete) return;
    const { id, fullName } = appToDelete;
    
    if (!window.confirm(`Tem certeza que deseja excluir o agendamento de ${fullName}? Todos os dados vinculados serão removidos.`)) {
      return;
    }

    setNotification({ message: `Excluindo ${fullName}...`, type: 'info' });
    setIsDeleting(id);

    try {
      // 1. Local removal first for instant UI response
      setAppointments(prev => prev.filter(a => a.id !== id));
      setTickets(prev => prev.filter(t => t.appointmentId !== id));
      if (selectedAppointment?.id === id) {
        setSelectedAppointment(null);
      }

      if (supabase) {
        // 2. Delete linked tickets first (to avoid foreign key constraint errors)
        const { error: tError } = await supabase.from('tickets').delete().eq('appointmentId', id);
        if (tError) console.warn('Erro ao limpar tickets:', tError);

        // 3. Delete the appointment
        const { error: aError } = await supabase.from('appointments').delete().eq('id', id);
        if (aError) throw aError;
      }

      setNotification({ message: `Candidato(a) ${fullName} excluído(a) com sucesso.`, type: 'success' });
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      setNotification({ 
        message: `Erro ao excluir: ${error.message || 'Verifique sua conexão.'}`, 
        type: 'error' 
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleRequestSent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    const updatedApp = { ...app, isRequestSent: !app.isRequestSent, updatedAt: new Date().toISOString() };
    
    // Optimistic update
    setAppointments(prev => prev.map(a => a.id === id ? updatedApp : a));
    if (selectedAppointment?.id === id) setSelectedAppointment(updatedApp);

    if (supabase) {
      try {
        const { error } = await supabase.from('appointments').upsert(updatedApp);
        if (error) throw error;
      } catch (err) {
        console.error('Error updating request status:', err);
      }
    }
  };

  const toggleConfirmation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const appToUpdate = appointments.find(a => a.id === id);
    if (!appToUpdate) return;

    const now = new Date().toISOString();
    const updatedApp = { 
      ...appToUpdate, 
      isConfirmed: !appToUpdate.isConfirmed,
      updatedAt: now // Move to top on activity
    };

    try {
      if (supabase) {
        const { error } = await supabase
          .from('appointments')
          .upsert(updatedApp);

        if (error) throw error;
      }

      setAppointments(prev => [updatedApp, ...prev.filter(app => app.id !== id)]);
      if (selectedAppointment?.id === id) setSelectedAppointment(updatedApp);
    } catch (error) {
      console.error('Error updating confirmation in Supabase:', error);
      setAppointments(prev => [updatedApp, ...prev.filter(app => app.id !== id)]);
      if (selectedAppointment?.id === id) setSelectedAppointment(updatedApp);
    }
  };

  const toggleResult = async (e: React.MouseEvent, id: string, result: 'APTO' | 'INAPTO') => {
    e.stopPropagation();
    const appToUpdate = appointments.find(a => a.id === id);
    if (!appToUpdate) return;

    // If clicking the same result, toggle it off (null)
    const newResult = appToUpdate.result === result ? null : result;
    const now = new Date().toISOString();
    const updatedApp = { 
      ...appToUpdate, 
      result: newResult,
      updatedAt: now // Move to top on activity
    };

    try {
      if (supabase) {
        const { error } = await supabase
          .from('appointments')
          .upsert(updatedApp);

        if (error) throw error;
      }

      setAppointments(prev => [updatedApp, ...prev.filter(app => app.id !== id)]);
      if (selectedAppointment?.id === id) setSelectedAppointment(updatedApp);
    } catch (error) {
      console.error('Error updating result in Supabase:', error);
      setAppointments(prev => [updatedApp, ...prev.filter(app => app.id !== id)]);
      if (selectedAppointment?.id === id) setSelectedAppointment(updatedApp);
    }
  };

  const sendWhatsAppMessage = (app: Appointment) => {
    const text = generateStudentText(app);
    const encodedText = encodeURIComponent(text);
    
    // Clean phone number: remove non-digits
    let phone = app.contact.replace(/\D/g, '');
    
    // Add Brazil country code if missing
    if (phone.length > 0 && !phone.startsWith('55')) {
      phone = '55' + phone;
    }
    
    if (phone.length < 10) {
      setNotification({ message: 'Número de telefone inválido ou incompleto.', type: 'error' });
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCPF(ticketFormData.studentCpf)) {
      setNotification({ message: 'CPF do aluno inválido. Deve conter 11 dígitos.', type: 'error' });
      return;
    }

    if (!validateRenach(ticketFormData.studentRenach)) {
      setNotification({ message: 'RENACH do aluno inválido. Verifique o número informado.', type: 'error' });
      return;
    }

    // Generate a robust ID
    const generateId = () => {
      try {
        return crypto.randomUUID();
      } catch (e) {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
      }
    };

    // Create the ticket object
    const ticketToSave: Ticket = editingTicketId 
      ? { 
          ...tickets.find(t => t.id === editingTicketId)!,
          ...ticketFormData,
          studentName: ticketFormData.studentName.trim(),
          studentCpf: ticketFormData.studentCpf.trim(),
          studentRenach: ticketFormData.studentRenach.trim().toUpperCase(),
          updatedAt: new Date().toISOString()
        }
      : { 
          ...ticketFormData,
          studentName: ticketFormData.studentName.trim(),
          studentCpf: ticketFormData.studentCpf.trim(),
          studentRenach: ticketFormData.studentRenach.trim().toUpperCase(),
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

    try {
      const oldTicket = editingTicketId ? tickets.find(t => t.id === editingTicketId) : null;
      
      if (supabase) {
        // Clean data: convert empty appointmentId string to null for Postgres UUID compatibility
        const dataToSupabase = {
          ...ticketToSave,
          appointmentId: ticketToSave.appointmentId === '' ? null : ticketToSave.appointmentId
        };

        const { error } = await supabase
          .from('tickets')
          .upsert(dataToSupabase);

        if (error) {
          if (error.code === 'PGRST205') {
            setNotification({ 
              message: 'Atenção: Tabela "tickets" não encontrada no Supabase. O chamado foi salvo apenas localmente.', 
              type: 'warning' 
            });
          } else {
            throw error;
          }
        }
      }

      let updatedTickets: Ticket[];
      if (editingTicketId) {
        updatedTickets = tickets.map(t => t.id === editingTicketId ? ticketToSave : t);
        setTickets(updatedTickets);
        setNotification({ message: 'Chamado atualizado com sucesso!', type: 'success' });
      } else {
        updatedTickets = [ticketToSave, ...tickets];
        setTickets(updatedTickets);
        setNotification({ message: 'Chamado aberto com sucesso!', type: 'success' });
      }

      // Update Appointment flags
      const now = new Date().toISOString();
      
      // 1. Update NEW linked appointment
      if (ticketToSave.appointmentId) {
        const appToUpdate = appointments.find(a => a.id === ticketToSave.appointmentId);
        if (appToUpdate) {
          const updatedApp = { ...appToUpdate, hasSgaCrtCall: true, updatedAt: now };
          if (supabase) await supabase.from('appointments').upsert(updatedApp);
          setAppointments(prev => [updatedApp, ...prev.filter(a => a.id !== updatedApp.id)]);
        }
      }

      // 2. If editing and appointmentId changed, check OLD linked appointment
      if (oldTicket && oldTicket.appointmentId && oldTicket.appointmentId !== ticketToSave.appointmentId) {
        const hasOtherTickets = updatedTickets.some(t => t.appointmentId === oldTicket.appointmentId);
        if (!hasOtherTickets) {
          const oldApp = appointments.find(a => a.id === oldTicket.appointmentId);
          if (oldApp) {
            const updatedOldApp = { ...oldApp, hasSgaCrtCall: false, updatedAt: now };
            if (supabase) await supabase.from('appointments').upsert(updatedOldApp);
            setAppointments(prev => [updatedOldApp, ...prev.filter(a => a.id !== updatedOldApp.id)]);
          }
        }
      }

      setIsTicketFormOpen(false);
      resetTicketForm();
    } catch (error: any) {
      console.error('Error saving ticket:', error);
      const errorDetail = error.message || error.code || 'Erro de conexão';
      setNotification({ 
        message: `Erro ao salvar chamado no banco: ${errorDetail}. O chamado foi mantido localmente.`, 
        type: 'error' 
      });
      
      // Fallback local update even on error
      if (editingTicketId) {
        setTickets(prev => prev.map(t => t.id === editingTicketId ? ticketToSave : t));
      } else {
        setTickets(prev => [ticketToSave, ...prev]);
      }
      setIsTicketFormOpen(false);
      resetTicketForm();
    }
  };

  const resetTicketForm = () => {
    setTicketFormData({
      studentName: '',
      studentCpf: '',
      studentRenach: '',
      type: 'SGA',
      status: 'Aberto',
      description: '',
      observations: '',
      appointmentId: ''
    });
    setEditingTicketId(null);
  };

  const deleteTicket = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ticketToDelete = tickets.find(t => t.id === id);
    if (!window.confirm('Tem certeza que deseja excluir este chamado?')) return;
    
    try {
      if (supabase) {
        const { error } = await supabase.from('tickets').delete().eq('id', id);
        if (error) {
          if (error.code === 'PGRST205') {
            console.warn('Tabela "tickets" não encontrada. Removendo apenas localmente.');
          } else {
            throw error;
          }
        }
      }
      
      const remainingTickets = tickets.filter(t => t.id !== id);
      setTickets(remainingTickets);
      
      // If it was linked to an appointment, check if we should reset the flag
      if (ticketToDelete?.appointmentId) {
        const hasOtherTickets = remainingTickets.some(t => t.appointmentId === ticketToDelete.appointmentId);
        if (!hasOtherTickets) {
          const appToUpdate = appointments.find(a => a.id === ticketToDelete.appointmentId);
          if (appToUpdate) {
            const updatedApp = { ...appToUpdate, hasSgaCrtCall: false, updatedAt: new Date().toISOString() };
            if (supabase) {
              await supabase.from('appointments').upsert(updatedApp);
            }
            setAppointments(prev => [updatedApp, ...prev.filter(a => a.id !== updatedApp.id)]);
          }
        }
      }
      
      setNotification({ message: 'Chamado excluído.', type: 'success' });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      setNotification({ message: 'Erro ao excluir chamado.', type: 'error' });
    }
  };

  const openTicketForStudent = (app: Appointment) => {
    setTicketFormData({
      studentName: app.fullName,
      studentCpf: app.cpf,
      studentRenach: app.renach,
      type: 'SGA',
      status: 'Aberto',
      description: '',
      observations: '',
      appointmentId: app.id
    });
    setCurrentView('tickets');
    setIsTicketFormOpen(true);
  };

  const copyToClipboard = (text: string, message: string = 'Texto copiado!') => {
    navigator.clipboard.writeText(text);
    setNotification({ message, type: 'success' });
  };

  const exportData = () => {
    try {
      const backupData = {
        appointments,
        tickets,
        version: '1.0',
        exportDate: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `backup_detran_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      setNotification({ message: 'Backup exportado com sucesso!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Erro ao exportar backup.', type: 'error' });
    }
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        let importedAppointments: Appointment[] = [];
        let importedTickets: Ticket[] = [];

        // Handle new format with both appointments and tickets
        if (json.version && json.appointments) {
          importedAppointments = json.appointments;
          if (json.tickets) {
            importedTickets = json.tickets;
          }
        } 
        // Handle old format (just an array of appointments)
        else if (Array.isArray(json)) {
          importedAppointments = json;
        } else {
          throw new Error('Formato de arquivo inválido.');
        }

        const isValidAppointments = importedAppointments.every(item => item.id && item.fullName && item.cpf);
        const isValidTickets = importedTickets.every(item => item.id && item.studentName && item.studentCpf);

        if (isValidAppointments && isValidTickets) {
          const now = new Date().toISOString();
          const sanitizedAppointments = importedAppointments.map(item => ({
            ...item,
            createdAt: item.createdAt || now,
            updatedAt: item.updatedAt || now
          }));
          
          const sanitizedTickets = importedTickets.map(item => ({
            ...item,
            createdAt: item.createdAt || now,
            updatedAt: item.updatedAt || now
          }));

          // Try to sync all to Supabase
          if (supabase) {
            if (sanitizedAppointments.length > 0) {
              const { error: appError } = await supabase
                .from('appointments')
                .upsert(sanitizedAppointments);
              if (appError) throw appError;
            }
            
            if (sanitizedTickets.length > 0) {
              const { error: ticketError } = await supabase
                .from('tickets')
                .upsert(sanitizedTickets);
              if (ticketError) throw ticketError;
            }
          }

          // Merge with existing data or replace? Let's replace to be a true restore, 
          // but maybe we should merge. Let's merge to avoid data loss.
          // Actually, since it's a backup, usually it restores the state.
          // Let's just set the state to the imported data to avoid duplicates, 
          // or we can rely on Supabase to merge them and then fetch.
          // Let's fetch from Supabase after a successful import to ensure consistency.
          
          setAppointments(sanitizedAppointments);
          setTickets(sanitizedTickets);
          setNotification({ message: 'Dados importados e sincronizados com sucesso!', type: 'success' });
          
          // Fetch from DB to ensure everything is perfectly synced
          fetchData(true);
        } else {
          throw new Error('Formato de arquivo inválido.');
        }
      } catch (error) {
        console.error('Error importing/syncing data:', error);
        setNotification({ message: 'Erro ao importar arquivo ou sincronizar com banco.', type: 'error' });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans">
      {/* Help Modal */}
      <AnimatePresence>
        {isFirstSync && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md"
          >
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-6 max-w-sm mx-4">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Sincronizando Dados</h3>
                <p className="text-slate-500 font-medium">Detectamos que este é um novo dispositivo. Estamos baixando seus agendamentos da nuvem...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHelpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-slate-100"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ajuda e Configuração</h2>
                  </div>
                  <button 
                    onClick={() => setIsHelpOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <section>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-600" /> Sincronização em Nuvem
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      Este sistema utiliza o <strong>Supabase</strong> para manter seus dados sincronizados entre múltiplos dispositivos. Para configurar:
                    </p>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                        <p className="text-xs text-slate-600">Crie um projeto no <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">Supabase</a>.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                        <p className="text-xs text-slate-600">Execute o script SQL contido no arquivo <code>supabase_schema.sql</code> no SQL Editor do Supabase.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                        <p className="text-xs text-slate-600">Configure as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> nas configurações do projeto.</p>
                      </div>
                    </div>
                    <button 
                      onClick={saveCloudBackup}
                      className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-bold border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Database className="w-4 h-4" /> Criar Ponto de Restauração na Nuvem
                    </button>
                  </section>

                  <section>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Download className="w-4 h-4 text-indigo-600" /> Backup e Segurança
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Recomendamos exportar um backup semanalmente. O arquivo gerado contém todos os seus agendamentos e chamados. Em caso de perda de dados, você pode restaurar tudo usando a função de importação.
                    </p>
                  </section>

                  <section>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-indigo-600" /> Comunicação
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Ao clicar no ícone do WhatsApp em um agendamento, o sistema gera automaticamente uma mensagem personalizada com os dados do exame para o aluno.
                    </p>
                  </section>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => setIsHelpOpen(false)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed left-1/2 top-20 z-50 pointer-events-none"
            >
              <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
                notification.type === 'error' 
                  ? 'bg-red-50 border-red-100 text-red-700' 
                  : notification.type === 'warning'
                  ? 'bg-orange-50 border-orange-100 text-orange-700'
                  : notification.type === 'info'
                  ? 'bg-blue-50 border-blue-100 text-blue-700'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
              }`}>
                {notification.type === 'error' ? <XCircle className="w-5 h-5" /> : 
                 notification.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                 notification.type === 'info' ? <Clock className="w-5 h-5" /> :
                 <CheckCircle2 className="w-5 h-5" />}
                <span className="text-sm font-bold">{notification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="bg-indigo-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-indigo-100 shadow-lg hidden xs:block">
              <ClipboardCheck className="text-white w-4 h-4 sm:w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-bold tracking-tight leading-tight">DETRAN</h1>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                  <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                    dbStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 
                    dbStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'
                  }`} />
                  <span className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                    {dbStatus === 'connected' ? 'Realtime ON' : 
                     dbStatus === 'error' ? 'Erro DB' : 'Offline'}
                  </span>
                  {dbStatus === 'error' && (
                    <button 
                      onClick={() => fetchData()}
                      className="ml-1 p-0.5 hover:bg-slate-200 rounded transition-colors"
                      title="Tentar novamente"
                    >
                      <RefreshCw className="w-2 h-2 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setCurrentView('home')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                currentView === 'home' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Início
            </button>
            <button 
              onClick={() => setCurrentView('appointments')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                currentView === 'appointments' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Agendamentos
            </button>
            <button 
              onClick={() => setCurrentView('tickets')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                currentView === 'tickets' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TicketIcon className="w-3.5 h-3.5" />
              Central de Chamados
            </button>
          </nav>

          <div className="flex-1 max-w-md hidden lg:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar por nome, CPF ou RENACH..." 
                className="w-full pl-10 pr-10 py-2 bg-slate-100 border-transparent rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none border border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-2 mr-0.5 sm:mr-2 sm:border-r border-slate-200 sm:pr-4">
              <button 
                onClick={() => setIsHelpOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg sm:rounded-2xl transition-all active:scale-95"
                title="Ajuda e Configuração"
              >
                <HelpCircle className="w-4 h-4 sm:w-5 h-5" />
              </button>
              <button 
                onClick={fetchData}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg sm:rounded-2xl transition-all active:scale-95"
                title="Sincronizar"
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setIsAgendaOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg sm:rounded-2xl transition-all active:scale-95"
                title="Ver Agenda"
              >
                <CalendarRange className="w-4 h-4 sm:w-5 h-5" />
              </button>
              <div className="hidden md:flex items-center gap-2">
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-2xl transition-all active:scale-95" title="Importar Backup">
                  <Upload className="w-5 h-5" />
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                </label>
                <button 
                  onClick={exportData}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-2xl transition-all active:scale-95"
                  title="Exportar Backup"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {unconfirmedToday.length > 0 && (
        <div className="bg-red-600 text-white py-2 px-4 shadow-lg relative z-20 overflow-hidden">
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: '-100%' }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="whitespace-nowrap flex items-center gap-8 font-black text-[11px] uppercase tracking-[0.2em]"
          >
            <span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> ATENÇÃO: {unconfirmedToday.length} AGENDAMENTO(S) PARA HOJE NÃO FORAM CONFIRMADOS! SOLICITE UMA NOVA DATA IMEDIATAMENTE.</span>
            <span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> ATENÇÃO: {unconfirmedToday.length} AGENDAMENTO(S) PARA HOJE NÃO FORAM CONFIRMADOS! SOLICITE UMA NOVA DATA IMEDIATAMENTE.</span>
            <span className="flex items-center gap-2"><XCircle className="w-4 h-4" /> ATENÇÃO: {unconfirmedToday.length} AGENDAMENTO(S) PARA HOJE NÃO FORAM CONFIRMADOS! SOLICITE UMA NOVA DATA IMEDIATAMENTE.</span>
          </motion.div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 md:pb-6 items-start">
        {currentView === 'home' ? (
          <HomeView 
            appointments={appointments} 
            tickets={tickets} 
            onNavigate={setCurrentView} 
            onSync={() => fetchData()}
            isLoading={isLoading}
            lastSyncTime={lastSyncTime}
          />
        ) : currentView === 'appointments' ? (
          <>
            {/* Appointments Header */}
            <div className="col-span-1 lg:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Gestão de Agendamentos</h2>
                <p className="text-sm text-slate-500">Acompanhe e organize as solicitações de exames.</p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus className="w-5 h-5" />
                Novo Agendamento
              </motion.button>
            </div>

            {/* Stats Section */}
            <div className="col-span-1 lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-2">
              <StatCard 
                label="Total" 
                value={stats.total} 
                icon={<LayoutDashboard className="w-4 h-4" />} 
                color="indigo" 
                isActive={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
              />
              <StatCard 
                label="Confirmados" 
                value={stats.confirmados} 
                icon={<ClipboardCheck className="w-4 h-4" />} 
                color="blue" 
                isActive={activeFilter === 'confirmed'}
                onClick={() => setActiveFilter('confirmed')}
              />
              <StatCard 
                label="Não Confirmados" 
                value={stats.naoConfirmados} 
                icon={<XCircle className="w-4 h-4" />} 
                color="red" 
                isActive={activeFilter === 'unconfirmed'}
                onClick={() => setActiveFilter('unconfirmed')}
              />
              <StatCard 
                label="Data Vencida" 
                value={stats.vencidos} 
                icon={<CalendarRange className="w-4 h-4" />} 
                color="amber" 
                isActive={activeFilter === 'expired'}
                onClick={() => setActiveFilter('expired')}
              />
              <StatCard 
                label="Chamados SGA/CRT" 
                value={stats.sgaCrt} 
                icon={<Database className="w-4 h-4" />} 
                color="emerald" 
                isActive={activeFilter === 'sga_crt'}
                onClick={() => setActiveFilter('sga_crt')}
              />
            </div>

            {/* Mobile Search */}
            <div className="lg:hidden col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* List Section */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Agendamentos Recentes
                  {activeFilter !== 'all' && (
                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[9px] font-black">
                      {activeFilter === 'confirmed' ? 'Confirmados' : activeFilter === 'expired' ? 'Data Vencida' : 'SGA/CRT'}
                    </span>
                  )}
                </h2>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Ordenar:</span>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'alphabetical')}
                    className="text-[10px] font-bold text-slate-600 bg-slate-100 border-none rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                  >
                    <option value="recent">Recentes</option>
                    <option value="alphabetical">A-Z</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium">Carregando agendamentos...</p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence mode="popLayout">
                      {filteredAppointments.map((app) => (
                        <motion.div
                          key={app.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => setSelectedAppointment(app)}
                          className={`group bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md relative overflow-hidden ${
                            selectedAppointment?.id === app.id 
                              ? 'border-indigo-500 ring-1 ring-indigo-500' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between relative z-10">
                            <div className="flex gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                app.examType === 'Legislação' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {app.examType === 'Legislação' ? <FileText className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {app.fullName}
                                </h3>
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">
                                  {app.renach}
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                    <User className="w-3 h-3 text-slate-400" /> {app.cpf}
                                  </span>
                                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                    <Calendar className="w-3 h-3 text-slate-400" /> {new Date(app.appointmentDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                                <div className="mt-2 text-[10px] text-slate-400 flex flex-col gap-0.5 italic">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> Lançado em: {new Date(app.createdAt).toLocaleString('pt-BR')}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-indigo-400 font-medium">
                                    <RefreshCw className="w-3 h-3" /> Modificado em: {new Date(app.updatedAt).toLocaleString('pt-BR')}
                                  </div>
                                </div>
                                {app.appointmentDate === todayStr && !app.isConfirmed && (
                                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-pulse w-fit">
                                    <XCircle className="w-3 h-3" /> NÃO AGENDADO - SOLICITAR NOVA DATA
                                  </div>
                                )}
                                {app.observations && (
                                  <div className="mt-2 text-[10px] text-orange-600 italic line-clamp-1 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                    "{app.observations}"
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendWhatsAppMessage(app);
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all"
                                  title="Enviar via WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => deleteAppointment(e, app)}
                                  disabled={isDeleting === app.id}
                                  className={`p-1.5 rounded-lg border transition-all ${
                                    isDeleting === app.id 
                                      ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' 
                                      : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                  }`}
                                  title="Excluir Agendamento"
                                >
                                  {isDeleting === app.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <div className="flex gap-1">
                                  {app.isConfirmed && (
                                    <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Confirmado</span>
                                  )}
                                  {app.result && (
                                    <span className={`${
                                      app.result === 'APTO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                    } text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter`}>
                                      {app.result}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg tracking-tighter ${
                                  app.examType === 'Legislação' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {app.examType}
                                </span>
                              </div>
                              <button 
                                onClick={(e) => toggleRequestSent(e, app.id)}
                                className={`p-1.5 rounded-lg transition-all border ${
                                  app.isRequestSent 
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm' 
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-amber-500 hover:text-amber-500'
                                }`}
                                title={app.isRequestSent ? "Pedido já enviado" : "Marcar como Pedido Enviado"}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => toggleConfirmation(e, app.id)}
                                className={`p-1.5 rounded-lg transition-all border ${
                                  app.isConfirmed 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-500'
                                }`}
                                title={app.isConfirmed ? "Desmarcar Confirmação" : "Confirmar Agendamento"}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              
                              {(app.isConfirmed || activeFilter === 'all') && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => toggleResult(e, app.id, 'APTO')}
                                    className={`text-[9px] font-black px-2 py-1 rounded-md transition-all border ${
                                      app.result === 'APTO'
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
                                    }`}
                                  >
                                    APTO
                                  </button>
                                  <button
                                    onClick={(e) => toggleResult(e, app.id, 'INAPTO')}
                                    className={`text-[9px] font-black px-2 py-1 rounded-md transition-all border ${
                                      app.result === 'INAPTO'
                                        ? 'bg-red-600 border-red-600 text-white shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-500'
                                    }`}
                                  >
                                    INAPTO
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {filteredAppointments.length === 0 && (
                      <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center shadow-sm">
                        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="text-slate-300 w-8 h-8" />
                        </div>
                        <h3 className="text-slate-900 font-bold">Nenhum agendamento encontrado</h3>
                        <p className="text-slate-500 text-sm mt-1">Tente ajustar sua busca ou adicione um novo registro.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-20 space-y-6">
                <AnimatePresence mode="wait">
                  {selectedAppointment ? (
                    <motion.div
                      key={selectedAppointment.id}
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="fixed inset-x-4 bottom-4 top-20 z-50 lg:relative lg:inset-auto lg:z-0 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl lg:shadow-xl flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-100 bg-white shrink-0">
                          <div className="flex justify-between items-start mb-6">
                            <button 
                              onClick={() => setSelectedAppointment(null)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all shadow-sm"
                              title="Voltar"
                            >
                              <X className="w-4 h-4 lg:hidden" />
                              <Home className="w-4 h-4 hidden lg:block" />
                            </button>
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => toggleRequestSent(e, selectedAppointment.id)}
                                className={`p-2 rounded-xl transition-all border flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest active:scale-95 ${
                                  selectedAppointment.isRequestSent 
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-100' 
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-amber-500 hover:text-amber-500'
                                }`}
                                title={selectedAppointment.isRequestSent ? "Pedido já enviado" : "Marcar como Pedido Enviado"}
                              >
                                <Send className="w-4 h-4" />
                                <span className="hidden sm:inline">{selectedAppointment.isRequestSent ? "Pedido Enviado" : "Enviar Pedido"}</span>
                              </button>
                              <button 
                                onClick={(e) => toggleConfirmation(e, selectedAppointment.id)}
                                className={`p-2 rounded-xl transition-all border flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest active:scale-95 ${
                                  selectedAppointment.isConfirmed 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-500'
                                }`}
                                title={selectedAppointment.isConfirmed ? "Desmarcar Confirmação" : "Confirmar Agendamento"}
                              >
                                <Check className="w-4 h-4" />
                                <span className="hidden sm:inline">{selectedAppointment.isConfirmed ? "Confirmado" : "Confirmar"}</span>
                              </button>
                              <button 
                                onClick={() => handleEdit(selectedAppointment)}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100 active:scale-95"
                                title="Editar"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => openTicketForStudent(selectedAppointment)}
                                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100 active:scale-95"
                                title="Abrir Chamado SGA/CRT"
                              >
                                <TicketIcon className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => deleteAppointment(e, selectedAppointment)}
                                disabled={isDeleting === selectedAppointment.id}
                                className={`p-2 rounded-xl transition-colors border active:scale-95 ${
                                  isDeleting === selectedAppointment.id
                                    ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                                    : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                }`}
                                title="Excluir"
                              >
                                {isDeleting === selectedAppointment.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900 leading-tight">{selectedAppointment.fullName}</h2>
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                              <span className="bg-indigo-100 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest">RENACH</span>
                              {selectedAppointment.renach}
                              {selectedAppointment.result && (
                                <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                                  selectedAppointment.result === 'APTO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {selectedAppointment.result}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                          <div className="grid grid-cols-2 gap-6">
                            <DetailItem icon={<User className="w-4 h-4" />} label="CPF" value={selectedAppointment.cpf} />
                            <DetailItem icon={<Calendar className="w-4 h-4" />} label="Data" value={new Date(selectedAppointment.appointmentDate + 'T12:00:00').toLocaleDateString('pt-BR')} />
                            <DetailItem icon={<MapPin className="w-4 h-4" />} label="Local" value={selectedAppointment.location} />
                            <DetailItem icon={<Phone className="w-4 h-4" />} label="Contato" value={selectedAppointment.contact} />
                            {selectedAppointment.result && (
                              <DetailItem 
                                icon={<CheckCircle2 className="w-4 h-4" />} 
                                label="Resultado" 
                                value={selectedAppointment.result} 
                                className={selectedAppointment.result === 'APTO' ? 'text-emerald-600' : 'text-red-600'}
                              />
                            )}
                            <DetailItem 
                              icon={<Clock className="w-4 h-4" />} 
                              label="Lançado no Sistema" 
                              value={new Date(selectedAppointment.createdAt).toLocaleString('pt-BR')} 
                            />
                            <DetailItem 
                              icon={<RefreshCw className="w-4 h-4" />} 
                              label="Última Modificação" 
                              value={new Date(selectedAppointment.updatedAt).toLocaleString('pt-BR')} 
                              className="text-indigo-600"
                            />
                          </div>

                          {selectedAppointment.observations && (
                            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                              <div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2">
                                <MessageSquare className="w-3 h-3" />
                                Observações
                              </div>
                              <p className="text-sm text-orange-700 leading-relaxed italic">
                                "{selectedAppointment.observations}"
                              </p>
                            </div>
                          )}

                          <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Status de Aptidão</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <StatusBadge label="Vista" isFit={selectedAppointment.isFitVision} />
                              <StatusBadge label="Psicólogo" isFit={selectedAppointment.isFitPsychologist} />
                              <StatusBadge label="Tela H572C" isFit={selectedAppointment.isFitH572C} />
                              <StatusBadge label="Tela CP02A" isFit={selectedAppointment.isFitCP02A} />
                              {selectedAppointment.examType === 'Prova de Rua' && (
                                <StatusBadge label="Legislação" isFit={selectedAppointment.isFitLegislation} />
                              )}
                            </div>
                          </div>

                          {selectedAppointment.isConfirmed && (
                            <div className="pt-6 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto para o Aluno</h3>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => sendWhatsAppMessage(selectedAppointment)}
                                    className="text-white hover:bg-emerald-700 text-[10px] font-bold flex items-center gap-1.5 bg-emerald-600 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                                  >
                                    <MessageCircle className="w-3 h-3" /> Enviar WhatsApp
                                  </button>
                                  <button 
                                    onClick={() => copyToClipboard(generateStudentText(selectedAppointment), 'Texto para aluno copiado!')}
                                    className="text-emerald-600 hover:text-emerald-700 text-[10px] font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors"
                                  >
                                    <Copy className="w-3 h-3" /> Copiar Texto
                                  </button>
                                </div>
                              </div>
                              <div className="bg-emerald-50 rounded-2xl p-5 font-sans text-[12px] text-emerald-900 whitespace-pre-wrap leading-relaxed border border-emerald-100 shadow-inner">
                                {generateStudentText(selectedAppointment)}
                              </div>
                            </div>
                          )}

                          <div className="pt-6 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto de Solicitação</h3>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => sendEmail(selectedAppointment)}
                                  className="text-white hover:bg-indigo-700 text-[10px] font-bold flex items-center gap-1.5 bg-indigo-600 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                                >
                                  <Mail className="w-3 h-3" /> Enviar E-mail
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(getSubject(selectedAppointment), 'Assunto copiado!')}
                                  className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
                                >
                                  <Copy className="w-3 h-3" /> Assunto
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(generateRequestText(selectedAppointment), 'Texto completo copiado!')}
                                  className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
                                >
                                  <Copy className="w-3 h-3" /> Copiar Tudo
                                </button>
                              </div>
                            </div>
                            <div className="bg-slate-900 rounded-2xl p-5 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
                              <div className="text-indigo-400 mb-2 font-bold pb-2 border-b border-slate-800">
                                ASSUNTO: {getSubject(selectedAppointment)}
                              </div>
                              {generateRequestText(selectedAppointment)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center shadow-sm hidden lg:block">
                      <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ChevronRight className="text-indigo-400 w-8 h-8" />
                      </div>
                      <h3 className="text-slate-900 font-bold mb-2">Visualizar Detalhes</h3>
                      <p className="text-slate-500 text-sm">Selecione um agendamento na lista para ver todas as informações e gerar o texto de solicitação.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-1 lg:col-span-12 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Central de Chamados</h2>
                <p className="text-sm text-slate-500">Controle de pendências SGA e CRT.</p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetTicketForm();
                  setIsTicketFormOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus className="w-5 h-5" />
                Novo Chamado
              </motion.button>
            </div>

            {/* Mobile Search for Tickets */}
            <div className="lg:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar chamados..." 
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Ticket Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{tickets.length}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[8px] sm:text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Abertos</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{tickets.filter(t => t.status === 'Aberto').length}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[8px] sm:text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Andamento</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600">{tickets.filter(t => t.status === 'Em Andamento').length}</p>
              </div>
              <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                <p className="text-[8px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Resolvidos</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{tickets.filter(t => t.status === 'Resolvido').length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(['Aberto', 'Em Andamento', 'Resolvido'] as TicketStatus[]).map((status) => (
                <div key={status} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'Aberto' ? 'bg-red-500' : status === 'Em Andamento' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      {status}
                      <span className="ml-2 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">
                        {filteredTickets.filter(t => t.status === status).length}
                      </span>
                    </h3>
                  </div>

                  <div className="space-y-3 min-h-[200px]">
                    {filteredTickets.filter(t => t.status === status).length > 0 ? (
                      filteredTickets.filter(t => t.status === status).map((ticket) => (
                        <motion.div
                          key={ticket.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                        >
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                            ticket.type === 'SGA' ? 'bg-red-100 text-red-700' : ticket.type === 'CRT' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {ticket.type}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setTicketFormData({
                                  studentName: ticket.studentName,
                                  studentCpf: ticket.studentCpf,
                                  studentRenach: ticket.studentRenach || '',
                                  type: ticket.type,
                                  status: ticket.status,
                                  description: ticket.description,
                                  observations: ticket.observations || '',
                                  appointmentId: ticket.appointmentId || ''
                                });
                                setEditingTicketId(ticket.id);
                                setIsTicketFormOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => deleteTicket(e, ticket.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{ticket.studentName}</h4>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CPF: {ticket.studentCpf}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">RENACH: {ticket.studentRenach}</p>
                        </div>
                        
                        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{ticket.description}"
                          </p>
                          {ticket.observations && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Observações:</p>
                              <p className="text-xs text-slate-500">{ticket.observations}</p>
                            </div>
                          )}
                        </div>

                        {ticket.appointmentId && (
                          <button 
                            onClick={() => {
                              setCurrentView('appointments');
                              setSearchTerm(ticket.studentCpf);
                            }}
                            className="mt-3 w-full py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                          >
                            <Calendar className="w-3 h-3" />
                            Ver Agendamento
                          </button>
                        )}

                        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                            <Clock className="w-3 h-3" />
                            {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                          <select 
                            value={ticket.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value as TicketStatus;
                              const updatedTicket = { ...ticket, status: newStatus, updatedAt: new Date().toISOString() };
                              try {
                                if (supabase) {
                                  await supabase.from('tickets').upsert(updatedTicket);
                                }
                                setTickets(prev => prev.map(t => t.id === ticket.id ? updatedTicket : t));
                              } catch (err) {
                                console.error('Erro ao atualizar status do chamado:', err);
                              }
                            }}
                            className="text-[10px] font-black uppercase bg-slate-100 border-none rounded-lg px-2 py-1.5 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                          >
                            <option value="Aberto">Aberto</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Resolvido">Resolvido</option>
                          </select>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="border-2 border-dashed border-slate-100 rounded-[2.5rem] py-12 text-center">
                      <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-6 h-6 text-slate-200" />
                      </div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem chamados</p>
                    </div>
                  )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Preencha os dados do candidato e as informações da prova.</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)} 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <FormLabel label="Nome Completo" />
                    <input 
                      required
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Ex: João da Silva Santos"
                    />
                  </div>
                  
                  <div>
                    <FormLabel label="CPF" />
                    <input 
                      required
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div>
                    <FormLabel label="RENACH" />
                    <input 
                      required
                      name="renach"
                      value={formData.renach}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="BA000000000"
                    />
                  </div>

                  <div>
                    <FormLabel label="Data da Prova" />
                    <input 
                      required
                      type="date"
                      name="appointmentDate"
                      value={formData.appointmentDate}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <FormLabel label="Horário" />
                    <input 
                      required
                      type="time"
                      name="appointmentTime"
                      value={formData.appointmentTime}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FormLabel label="Serviço" />
                    <select 
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleInputChange}
                      className="form-input appearance-none bg-no-repeat bg-[right_1rem_center]"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem' }}
                    >
                      <option value="151 – 1ª Habilitação Veicular (2 rodas)">1ª Habilitação A</option>
                      <option value="151 – 1ª Habilitação Veicular (4 rodas)">1ª Habilitação B</option>
                      <option value="151 – 1ª Habilitação Veicular (2 e 4 rodas)">1ª Habilitação AB</option>
                      <option value="Adição de Categoria">Adição de Categoria</option>
                      <option value="Mudança de Categoria">Mudança de Categoria</option>
                      <option value="Curso">Curso</option>
                      <option value="Renovação com Atualização">Renovação com Atualização</option>
                      <option value="Reciclagem">Reciclagem</option>
                      <option value="Reabilitação">Reabilitação</option>
                    </select>
                  </div>

                  <div>
                    <FormLabel label="Categoria" />
                    <select 
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="form-input appearance-none bg-no-repeat bg-[right_1rem_center]"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem' }}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                    </select>
                  </div>

                  <div>
                    <FormLabel label="Tipo de Exame" />
                    <select 
                      name="examType"
                      value={formData.examType}
                      onChange={handleInputChange}
                      className="form-input appearance-none bg-no-repeat bg-[right_1rem_center]"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.25rem' }}
                    >
                      <option value="Legislação">Legislação</option>
                      <option value="Prova de Rua">Prova de Rua</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <FormLabel label="Local do Agendamento" />
                    <input 
                      required
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Ex: 3 RETRAN NAZARÉ"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FormLabel label="Contato" />
                    <input 
                      required
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Ex: (71) 98314-9916"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FormLabel label="Observações" />
                    <textarea 
                      name="observations"
                      value={formData.observations}
                      onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                      className="form-input min-h-[100px] py-3 resize-none"
                      placeholder="Alguma observação importante sobre o candidato..."
                    />
                  </div>

                  <div className="md:col-span-2 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Checkbox label="Agendamento Confirmado" name="isConfirmed" checked={formData.isConfirmed} onChange={handleInputChange} />
                    <Checkbox label="Chamados SGA/CRT" name="hasSgaCrtCall" checked={formData.hasSgaCrtCall} onChange={handleInputChange} />
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-slate-100">
                    <FormLabel label="Resultado do Exame" />
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, result: prev.result === 'APTO' ? null : 'APTO' }))}
                        className={`flex-1 py-3 rounded-2xl border font-bold transition-all ${
                          formData.result === 'APTO' 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' 
                            : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                      >
                        APTO
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, result: prev.result === 'INAPTO' ? null : 'INAPTO' }))}
                        className={`flex-1 py-3 rounded-2xl border font-bold transition-all ${
                          formData.result === 'INAPTO' 
                            ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200' 
                            : 'bg-white border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-500'
                        }`}
                      >
                        INAPTO
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase mb-5 tracking-widest">Verificação de Aptidão</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Checkbox label="Apto no Exame de Vista" name="isFitVision" checked={formData.isFitVision} onChange={handleInputChange} />
                    <Checkbox label="Apto no Psicólogo" name="isFitPsychologist" checked={formData.isFitPsychologist} onChange={handleInputChange} />
                    <Checkbox label="Apto na Tela H572C" name="isFitH572C" checked={formData.isFitH572C} onChange={handleInputChange} />
                    <Checkbox label="Apto na Tela CP02A" name="isFitCP02A" checked={formData.isFitCP02A} onChange={handleInputChange} />
                    {formData.examType === 'Prova de Rua' && (
                      <Checkbox label="Apto na Prova de Legislação" name="isFitLegislation" checked={formData.isFitLegislation} onChange={handleInputChange} />
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                  >
                    {editingId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ticket Form Modal */}
      <AnimatePresence>
        {isTicketFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTicketFormOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40, rotateX: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40, rotateX: 10 }}
              transition={{ 
                type: "spring",
                damping: 25,
                stiffness: 300,
                mass: 0.8
              }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden perspective-1000"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-2xl font-bold text-slate-900">
                    {editingTicketId ? 'Editar Chamado' : 'Abrir Novo Chamado'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Registre pendências SGA ou CRT para acompanhamento.</p>
                </motion.div>
                <button 
                  onClick={() => setIsTicketFormOpen(false)} 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleTicketSubmit} className="p-8 space-y-6">
                <motion.div 
                  className="space-y-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                >
                  {[
                    { label: "Nome do Aluno", value: ticketFormData.studentName, onChange: (v: string) => setTicketFormData(prev => ({ ...prev, studentName: v })), placeholder: "Nome completo", required: true },
                    { label: "CPF", value: ticketFormData.studentCpf, onChange: (v: string) => setTicketFormData(prev => ({ ...prev, studentCpf: maskCPF(v) })), placeholder: "000.000.000-00", required: true },
                    { label: "RENACH", value: ticketFormData.studentRenach, onChange: (v: string) => setTicketFormData(prev => ({ ...prev, studentRenach: v.toUpperCase() })), placeholder: "BA000000000", required: true }
                  ].map((field, i) => (
                    <motion.div 
                      key={field.label}
                      variants={{
                        hidden: { y: 10, opacity: 0 },
                        visible: { y: 0, opacity: 1 }
                      }}
                    >
                      <FormLabel label={field.label} />
                      <input 
                        required={field.required}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="form-input focus:scale-[1.01] transition-transform"
                        placeholder={field.placeholder}
                      />
                    </motion.div>
                  ))}

                  <motion.div 
                    className="grid grid-cols-2 gap-4"
                    variants={{
                      hidden: { y: 10, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                    }}
                  >
                    <div>
                      <FormLabel label="Tipo" />
                      <select 
                        value={ticketFormData.type}
                        onChange={(e) => setTicketFormData(prev => ({ ...prev, type: e.target.value as TicketType }))}
                        className="form-input focus:scale-[1.02] transition-transform"
                      >
                        <option value="SGA">SGA</option>
                        <option value="CRT">CRT</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <FormLabel label="Status" />
                      <select 
                        value={ticketFormData.status}
                        onChange={(e) => setTicketFormData(prev => ({ ...prev, status: e.target.value as TicketStatus }))}
                        className="form-input focus:scale-[1.02] transition-transform"
                      >
                        <option value="Aberto">Aberto</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Resolvido">Resolvido</option>
                      </select>
                    </div>
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { y: 10, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                    }}
                  >
                    <FormLabel label="Descrição do Problema" />
                    <textarea 
                      required
                      rows={3}
                      value={ticketFormData.description}
                      onChange={(e) => setTicketFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="form-input resize-none focus:scale-[1.01] transition-transform"
                      placeholder="Descreva detalhadamente o problema..."
                    />
                  </motion.div>

                  <motion.div
                    variants={{
                      hidden: { y: 10, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                    }}
                  >
                    <FormLabel label="Observações Internas" />
                    <textarea 
                      rows={2}
                      value={ticketFormData.observations}
                      onChange={(e) => setTicketFormData(prev => ({ ...prev, observations: e.target.value }))}
                      className="form-input resize-none focus:scale-[1.01] transition-transform"
                      placeholder="Notas adicionais para a equipe..."
                    />
                  </motion.div>
                </motion.div>

                <motion.div 
                  className="flex gap-4 pt-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <button 
                    type="button"
                    onClick={() => setIsTicketFormOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] px-6 py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                  >
                    {editingTicketId ? 'Salvar Alterações' : 'Abrir Chamado'}
                  </button>
                </motion.div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Agenda Modal */}
      <AnimatePresence>
        {isAgendaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAgendaOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <CalendarRange className="w-6 h-6 text-indigo-600" />
                    Agenda de Provas
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Resumo de agendamentos por data.</p>
                </div>
                <button 
                  onClick={() => setIsAgendaOpen(false)} 
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {appointmentsByDate.length > 0 ? (
                  <div className="space-y-3">
                    {appointmentsByDate.map((group) => (
                      <div 
                        key={group.date}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                          group.date === todayStr 
                            ? 'bg-indigo-50 border-indigo-200' 
                            : 'bg-white border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            group.date === todayStr ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {new Date(group.date + 'T12:00:00').getDate()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {new Date(group.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                              {group.date === todayStr ? 'Hoje' : group.date < todayStr ? 'Passado' : 'Futuro'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-slate-900 leading-none">{group.count}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                            {group.confirmed} confirmados
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Nenhum agendamento encontrado.</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setIsAgendaOpen(false)}
                  className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                >
                  Fechar Agenda
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 z-40 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-lg bg-white/90">
        <button 
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${currentView === 'home' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
        </button>
        <button 
          onClick={() => setCurrentView('appointments')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${currentView === 'appointments' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-tighter">Agenda</span>
        </button>
        
        {/* Quick Add Button Mobile */}
        <button 
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="bg-indigo-600 text-white p-4 rounded-full -mt-10 shadow-xl shadow-indigo-200 border-4 border-white active:scale-90 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setCurrentView('tickets')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${currentView === 'tickets' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <TicketIcon className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-tighter">Chamados</span>
        </button>
        <button 
          onClick={() => setIsAgendaOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400 active:scale-90 transition-all"
        >
          <CalendarRange className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-tighter">Resumo</span>
        </button>
      </div>

      <style>{`
        .form-input {
          width: 100%;
          padding: 0.875rem 1.25rem;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          outline: none;
        }
        .form-input:focus {
          background-color: white;
          border-color: #6366F1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>
    </div>
  );
}
