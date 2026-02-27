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

export const getSubject = (app: any) => {
  const firstName = app.fullName.trim().split(' ')[0].toUpperCase();
  return `PROVA DE ${app.examType.toUpperCase()} - ${app.renach.toUpperCase()} ${firstName}`;
};

export const generateRequestText = (app: any) => {
  const date = new Date(app.appointmentDate + 'T12:00:00');
  const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const weekday = weekdays[date.getDay()];
  const formattedDate = date.toLocaleDateString('pt-BR');

  return `Prezados,
Solicito o agendamento de Prova Teórica de ${app.examType} para o candidato abaixo, conforme data previamente alinhada com a Banca Examinadora local.
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
- TELA CP02A: ${app.isFitCP02A ? 'APTO' : 'INAPTO'}${app.examType === 'Rua' ? `\n- PROVA LEGISLAÇÃO: ${app.isFitLegislation ? 'APTO' : 'INAPTO'}` : ''}`;
};

export const generateStudentText = (app: any) => {
  const date = new Date(app.appointmentDate + 'T12:00:00');
  const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const weekday = weekdays[date.getDay()];
  const formattedDate = date.toLocaleDateString('pt-BR');

  return `📢 PROVA DE LEGISLAÇÃO – DETRAN-BA

${app.fullName.toUpperCase()}, informamos que sua prova teórica de legislação está agendada para:

📅 ${formattedDate} (${weekday})
⏰ ${app.appointmentTime || '--:--'}
📍 ${app.location}

Dados do candidato:
• CPF: ${app.cpf}
• RENACH: ${app.renach.toUpperCase()}
• Serviço: ${app.serviceType}
• Categoria: ${app.category}

➡️ Comparecer com 30 minutos de antecedência, portando documento oficial com foto.

${app.location} | DETRAN-BA
LOCAL: RODOVIARIA DE NAZARÉ-BA`;
};
