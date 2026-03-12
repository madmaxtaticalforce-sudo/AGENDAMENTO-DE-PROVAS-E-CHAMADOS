-- SCHEMA PARA SUPABASE (POSTGRESQL)
-- Este arquivo contém a estrutura das tabelas necessárias para o funcionamento do sistema.

-- 1. Tabela de Agendamentos (appointments)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fullName" TEXT NOT NULL,
    cpf TEXT NOT NULL,
    renach TEXT NOT NULL,
    "appointmentDate" DATE NOT NULL,
    location TEXT,
    contact TEXT,
    "isFitVision" BOOLEAN DEFAULT false,
    "isFitPsychologist" BOOLEAN DEFAULT false,
    "isFitH572C" BOOLEAN DEFAULT false,
    "isFitCP02A" BOOLEAN DEFAULT false,
    "isFitLegislation" BOOLEAN DEFAULT false,
    "hasSgaCrtCall" BOOLEAN DEFAULT false,
    "isConfirmed" BOOLEAN DEFAULT false,
    "isRequestSent" BOOLEAN DEFAULT false,
    result TEXT CHECK (result IN ('APTO', 'INAPTO', NULL)),
    observations TEXT,
    "appointmentTime" TEXT,
    "serviceType" TEXT,
    category TEXT,
    "examType" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Chamados (tickets)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentName" TEXT NOT NULL,
    "studentCpf" TEXT NOT NULL,
    "studentRenach" TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT,
    observations TEXT,
    "appointmentId" UUID REFERENCES appointments(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ DEFAULT now(),
    "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar Realtime para as tabelas
-- No painel do Supabase, vá em Database -> Replication -> Tables e marque 'appointments' e 'tickets'.

-- 4. Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_appointments_cpf ON appointments(cpf);
CREATE INDEX IF NOT EXISTS idx_appointments_renach ON appointments(renach);
CREATE INDEX IF NOT EXISTS idx_tickets_student_cpf ON tickets("studentCpf");
