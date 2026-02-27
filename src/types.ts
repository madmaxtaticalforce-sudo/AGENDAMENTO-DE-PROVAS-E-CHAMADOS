export interface Appointment {
  id: string;
  fullName: string;
  cpf: string;
  renach: string;
  appointmentDate: string;
  appointmentTime: string;
  location: string;
  contact: string;
  serviceType: string;
  category: string;
  isFitVision: boolean;
  isFitPsychologist: boolean;
  isFitH572C: boolean;
  isFitCP02A: boolean;
  isFitLegislation: boolean;
  hasSgaCrtCall: boolean;
  examType: 'Legislação' | 'Rua';
  isConfirmed: boolean;
  result?: 'APTO' | 'INAPTO' | null;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExamType = 'Legislação' | 'Rua';

export type TicketStatus = 'Aberto' | 'Em Andamento' | 'Resolvido';
export type TicketType = 'SGA' | 'CRT' | 'Outro';

export interface Ticket {
  id: string;
  appointmentId?: string; // Linked student
  studentName: string;
  studentCpf: string;
  type: TicketType;
  status: TicketStatus;
  description: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}
