# Changelog

Todas as mudanças relevantes do projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.1.0] - 2026-05-28

### Adicionado
- **Financeiro / Histórico**: nova aba com registros de faturamento mensal e anual
  - Sub-tabs Mensal e Anual
  - Colunas: Faturamento (orçamentos pagos), Gastos (peças + materiais), Lucro líquido
  - Rodapé com totais gerais em destaque
- **Real-time update no Orçamento**: listener `onSnapshot` no `OrcamentoDetalhe` — quando o cliente assina pelo link público, o status atualiza instantaneamente na tela do admin (sem necessidade de recarregar a página)

### Corrigido
- **Número do orçamento na assinatura**: `enviarParaAssinatura` agora busca dados frescos diretamente do Firestore antes de gerar o snapshot, garantindo que o número real seja exibido na página de assinatura do cliente
- **Texto "IP mascarado"**: removido da tela de sucesso após assinatura — informação técnica desnecessária para o cliente

---

## [1.0.0] - 2026-05-27

### Adicionado
- **Assinatura digital de orçamento**: cliente recebe link único (7 dias de validade) e assina com nome + 4 últimos dígitos do celular
  - Página pública `/assinar/:token` — sem necessidade de login
  - IP mascarado (apenas 2 primeiros grupos armazenados)
  - Firestore Rules com validação por token e campos restritos
  - Card de assinatura registrada no detalhe do orçamento (nome, data, IP)
  - Admin pode "Aprovar direto" ignorando o fluxo de assinatura
- **Status `aguardando_assinatura`** com badge roxo
- **Clientes**: exibição de contagem de veículos por cliente
- **Carros**: exibição de quantidade de orçamentos e último atendimento
- **Impressão sem URL da Vercel**: relatório abre em popup `about:blank` para evitar header do browser

### Corrigido
- Carregamento resiliente de novas coleções (`fornecedores`, `configuracoes`, `materiais`) via `Promise.allSettled` — evita falha total caso regras ainda não estejam publicadas no Firebase

---

## [0.9.0] - 2026-05-20

### Adicionado
- Módulo **Fornecedores** (CRUD completo)
- Módulo **Configurações** da empresa (nome, CNPJ, endereço, telefone)
- Módulo **Materiais** (saídas avulsas no financeiro)
- **Financeiro** reestruturado: abas Entradas, Saídas (peças por fornecedor + materiais) e Perdas
- Status **Pago** para orçamentos liquidados
- Orçamentos tipo **Mecânica** e **Funilaria & Estética**
- Campo de troca de óleo (última e próxima troca) nos orçamentos de mecânica
- Fonte **Poppins** em todo o sistema

### Corrigido
- Duplicação de clientes/carros ao criar orçamentos — agora vinculam ao cadastro existente
