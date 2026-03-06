/**
 * Helper functions for the Detran Appointment System
 */

export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const validateCPF = (cpf: string) => {
  const clean = cpf.replace(/\D/g, '');
  return clean.length === 11;
};

export const validateRenach = (renach: string) => {
  // RENACH is usually 9 or 11 digits, but can vary. 
  // Basic check for at least 9 characters.
  return renach.trim().length >= 9;
};

export const normalizeString = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/gi, ''); // Remove special characters
};

export const getSubject = (app: any) => {
  const firstName = app.fullName.trim().split(' ')[0].toUpperCase();
  const type = app.examType.toUpperCase();
  const subjectType = type.startsWith('PROVA DE') ? type : `PROVA DE ${type}`;
  return `${subjectType} - ${app.renach.toUpperCase()} ${firstName}`;
};

export const generateRequestText = (app: any) => {
  const date = new Date(app.appointmentDate + 'T12:00:00');
  const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const weekday = weekdays[date.getDay()];
  const formattedDate = date.toLocaleDateString('pt-BR');

  return `Prezados,
Solicito o agendamento de ${app.examType} para o candidato abaixo, conforme data previamente alinhada com a Banca Examinadora local.
DATA DO AGENDAMENTO: ${formattedDate} (${weekday})
-----------------------------------------
**Dados do candidato:**

NOME: ${app.fullName.toUpperCase()}
CPF: ${app.cpf}
RENACH: ${app.renach.toUpperCase()}
TIPO DE EXAME: ${app.examType.toUpperCase()}
DATA: ${formattedDate}
LOCAL: ${app.location}
CONTATO: ${app.contact}
-----------------------------------------
**STATUS DE APTIDÃO:**

- VISTA: ${app.isFitVision ? 'APTO' : 'INAPTO'}
- PSICÓLOGO: ${app.isFitPsychologist ? 'APTO' : 'INAPTO'}
- TELA H572C: ${app.isFitH572C ? 'APTO' : 'INAPTO'}
- TELA CP02A: ${app.isFitCP02A ? 'APTO' : 'INAPTO'}${app.examType === 'Prova de Rua' ? `\n- PROVA LEGISLAÇÃO: ${app.isFitLegislation ? 'APTO' : 'INAPTO'}` : ''}`;
};

export const generateStudentText = (app: any) => {
  const date = new Date(app.appointmentDate + 'T12:00:00');
  const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const weekday = weekdays[date.getDay()];
  const formattedDate = date.toLocaleDateString('pt-BR');

  const isRua = app.examType === 'Prova de Rua';
  const examName = isRua ? 'PROVA DE RUA' : app.examType.toUpperCase();
  const examDesc = isRua ? 'prova de rua' : 'prova teórica de legislação';

  let location = app.location;
  if (isRua) {
    location = location.replace('CIR STO DE JESUS', '11 CIR STO DE JESUS');
  }

  const cityInfo = isRua ? '\n🏙️ CIDADE: STO DE JESUS-BA' : '';
  const footerLocal = isRua ? 'SHOPPING ITAGUARI' : 'RODOVIARIA DE NAZARÉ-BA';

  return `📢 ${examName} – DETRAN-BA

${app.fullName.toUpperCase()}, informamos que sua ${examDesc} está agendada para:

📅 ${formattedDate} (${weekday})
⏰ ${app.appointmentTime || '--:--'}
📍 ${location}${cityInfo}

Dados do candidato:
• CPF: ${app.cpf}
• RENACH: ${app.renach.toUpperCase()}
• Serviço: ${app.serviceType}
• Categoria: ${app.category}

➡️ Comparecer com 30 minutos de antecedência, portando documento oficial com foto.

${location} | DETRAN-BA
LOCAL: ${footerLocal}`;
};
