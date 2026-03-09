# Sistema de Gestão de Agendamentos - DETRAN CRT

Este é um aplicativo profissional desenvolvido para otimizar a gestão de agendamentos de exames (Legislação e Prova de Rua) e o acompanhamento de chamados técnicos (SGA/CRT). O sistema oferece sincronização em tempo real, ferramentas de comunicação direta e relatórios estatísticos.

## 🚀 Funcionalidades Principais

### 📅 Gestão de Agendamentos
- **Cadastro Detalhado:** Registro completo de alunos com CPF, RENACH e informações de contato.
- **Filtros Inteligentes:** Visualize agendamentos por status (Confirmados, Não Confirmados, Vencidos) ou tipo de exame.
- **Status em Tempo Real:** Acompanhamento visual de agendamentos para o dia atual com alertas de pendências.
- **Integração WhatsApp:** Envio de mensagens automáticas de confirmação e orientações para os alunos com um clique.
- **Solicitação via E-mail:** Integração com Outlook para envio formal de solicitações ao DETRAN.

### 🎫 Central de Chamados (SGA/CRT)
- **Acompanhamento de Processos:** Abertura e gestão de chamados vinculados ou não a agendamentos específicos.
- **Histórico de Observações:** Registro detalhado de intercorrências e respostas da TI/SENATRAN.
- **Status de Resolução:** Controle de chamados abertos, em andamento ou resolvidos.

### 📊 Painel de Controle (Dashboard)
- **Estatísticas Rápidas:** Visualização imediata do volume de trabalho e pendências.
- **Agenda Visual:** Calendário integrado para visualização da distribuição de exames ao longo do mês.

### 💾 Segurança e Dados
- **Sincronização Supabase:** Banco de dados em nuvem com atualização em tempo real entre múltiplos dispositivos.
- **Backup e Restauração:** Ferramenta robusta para exportar e importar todos os dados do sistema em formato JSON.
- **Modo Offline:** Persistência local (LocalStorage) para garantir que nenhum dado seja perdido em caso de instabilidade na rede.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React.js com TypeScript
- **Estilização:** Tailwind CSS (Design moderno e responsivo)
- **Animações:** Framer Motion
- **Ícones:** Lucide React
- **Backend/Database:** Supabase (PostgreSQL + Realtime)
- **Build Tool:** Vite

## ⚙️ Configuração Necessária

Para que o sistema funcione com sincronização em nuvem, é necessário configurar as variáveis de ambiente no arquivo `.env`:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### Estrutura do Banco de Dados (SQL)

O sistema utiliza duas tabelas principais: `appointments` e `tickets`. Certifique-se de que o Realtime esteja ativado para ambas no painel do Supabase.

## 📂 Como Exportar/Importar Dados

1. **Exportar:** Clique no ícone de download no topo da tela para gerar um arquivo `.json` com todos os agendamentos e chamados atuais.
2. **Importar:** Clique no ícone de upload e selecione um arquivo de backup válido. O sistema irá mesclar e sincronizar os dados automaticamente.

---

Desenvolvido para proporcionar agilidade e organização no fluxo de trabalho diário.
