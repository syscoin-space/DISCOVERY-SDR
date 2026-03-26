"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen, Cpu, Target, MessageSquare } from "lucide-react";
import { GlossaryItemData } from "@/components/glossary/GlossaryItemCard";
import { GlossaryCategoryList } from "@/components/glossary/GlossaryCategoryList";

// ─── Data ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "metodologia", label: "Metodologia", icon: BookOpen, description: "Termos Aaron Ross" },
  { id: "siglas", label: "Siglas do Sistema", icon: Cpu, description: "ICP, RFV, 3WH" },
  { id: "praticas", label: "Boas Práticas", icon: Target, description: "Quando usar cada canal" },
  { id: "discovery", label: "Roteiro de Discovery", icon: MessageSquare, description: "Perguntas e framework" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const GLOSSARY: Record<CategoryId, GlossaryItemData[]> = {
  metodologia: [
    {
      title: "Receita Previsível (Predictable Revenue)",
      body: "Metodologia criada por Aaron Ross na Salesforce que separa as funções de prospecção e fechamento. O princípio central: nunca peça referências, nunca faça cold calling tradicional. Use emails de prospecção curtos e diretos para identificar o decisor antes de ligar.",
      tag: "Aaron Ross",
      highlight: true,
    },
    {
      title: "Cold Calling 2.0",
      body: "Não é ligar para desconhecidos. É ligar apenas para quem já demonstrou algum sinal de interesse ou foi indicado. A ligação vem DEPOIS do email de prospecção, não antes.",
      tag: "Aaron Ross",
    },
    {
      title: "Seeds (Sementes)",
      body: "Leads que chegam de forma orgânica: indicações, boca a boca, clientes satisfeitos. São os leads de maior qualidade e maior taxa de conversão. Cuide dos seus clientes atuais — eles são sua melhor fonte de novos negócios.",
      tag: "Aaron Ross",
    },
    {
      title: "Nets (Redes)",
      body: "Leads gerados por marketing em escala: conteúdo, SEO, eventos, anúncios. Chegam em volume mas com qualidade variável. Precisam de qualificação rápida para não desperdiçar tempo do SDR.",
      tag: "Aaron Ross",
    },
    {
      title: "Spears (Lanças)",
      body: "Prospecção ativa e direcionada — o que o SDR faz aqui. Você identifica o perfil ideal (ICP), pesquisa a empresa, personaliza a abordagem. Menor volume, maior qualidade. É o trabalho do Discovery SDR.",
      tag: "Aaron Ross",
      highlight: true,
    },
    {
      title: "Separação de Funções",
      body: "Aaron Ross defende 3 papéis distintos:\n\n• SDR (Sales Development Rep): apenas prospecta e qualifica\n• AE/Closer: apenas fecha negócios\n• Customer Success: cuida dos clientes existentes\n\nMisturar funções destrói a previsibilidade da receita.",
      tag: "Aaron Ross",
    },
    {
      title: "O Email de Prospecção Perfeito",
      body: 'Máximo 3-5 linhas. Não fale sobre você — fale sobre o problema do cliente. Termine com UMA pergunta simples de sim/não.\n\n"Faz sentido conversar 15min sobre isso?"',
      tag: "Aaron Ross",
      highlight: true,
    },
  ],
  siglas: [
    {
      title: "ICP — Ideal Customer Profile",
      body: "Perfil de Cliente Ideal. Critérios que definem se um e-commerce tem fit com a solução da Retentio. Agora em escala de 0-100.\n\n90-100: Verde (Contrato Certo) — priorize agora\n75-89: Azul (Quente) — vale o esforço\n51-74: Laranja (Parcial) — qualifique mais antes de avançar\n0-50: Vermelho (Fora do ICP) — considere remover do funil",
      tag: "Sistema",
      highlight: true,
    },
    {
      title: "RFV — Recência, Frequência, Valor",
      body: "Matriz de segmentação da base de clientes do e-commerce.\n\nRecência: quando o cliente comprou pela última vez\nFrequência: quantas vezes comprou\nValor: quanto gastou no total\n\nA Retentio usa o RFV para mostrar ao e-commerce quem está dormindo na base e pode ser reativado.",
      tag: "Sistema",
    },
    {
      title: "3WH — What, When, Who, How",
      body: "Framework de Discovery da Retentio:\n\nWHAT: O que o e-commerce vende? Qual o nicho?\nWHEN: Quando os clientes recompram? Qual o ciclo?\nWHO: Quem é o decisor? Quem usa o ERP?\nHOW: Como funciona a operação? Qual a stack tecnológica?",
      tag: "Sistema",
      highlight: true,
    },
    {
      title: "SDR — Sales Development Representative",
      body: "Profissional responsável exclusivamente pela prospecção e qualificação de leads. Não fecha negócios — passa para o Closer. Seu sucesso é medido em reuniões qualificadas agendadas, não em vendas fechadas.",
      tag: "Sistema",
    },
  ],
  praticas: [
    {
      title: "Melhores horários para ligar",
      body: "Segunda-feira manhã: evitar (executivos em reunião de planejamento)\nTerça a quinta, 10h-12h: ótimo (já começaram o dia, ainda não no almoço)\nTerça a quinta, 14h-17h: bom (pós-almoço, ainda produtivos)\nSexta tarde: evitar (modo fim de semana)\n\nMelhor horário geral: terça ou quarta, entre 10h e 11h",
      tag: "Prática",
      highlight: true,
    },
    {
      title: "Melhores horários para WhatsApp",
      body: "Manhã: 8h30-9h30 (antes das reuniões)\nAlmoço: 12h-13h (momento de lazer, mais receptivo)\nNoite: 19h-21h (após o trabalho, mas não muito tarde)\n\nEvite: horário comercial intenso (9h-12h é quando estão ocupados)",
      tag: "Prática",
    },
    {
      title: "Sequência ideal de canais",
      body: "1º contato: Email (menos invasivo, dá tempo de processar)\n2º contato: WhatsApp (se não respondeu o email em 2 dias)\n3º contato: Ligação (se não respondeu WhatsApp em 1 dia)\n4º contato: LinkedIn (mensagem curta e profissional)\n\nNunca ligue cold — sempre preceda por email ou mensagem",
      tag: "Prática",
      highlight: true,
    },
    {
      title: "Regra dos 3 não-respostas",
      body: "Se tentou 3 vezes por canais diferentes sem resposta:\nPause 7-10 dias e tente novamente com ângulo diferente.\nSe ainda sem resposta após nova rodada: mova para Nutrição.\n\nInsistência excessiva queima o lead para sempre.",
      tag: "Prática",
    },
    {
      title: "Personalização mínima obrigatória",
      body: 'Antes de qualquer contato, saiba:\n\n• O nome da empresa e do decisor\n• O nicho/segmento\n• A plataforma de e-commerce que usam\n• Um dado específico (ex: "vi que vocês vendem X no Instagram")\n\nTemplates genéricos têm taxa de resposta ~2%. Personalizados: 15-30%.',
      tag: "Prática",
      highlight: true,
    },
  ],
  discovery: [
    {
      title: "O objetivo do Discovery",
      body: "Não é vender. É entender se faz sentido avançar. Você está qualificando o lead, não convencendo. Se não tem fit, é melhor descobrir em 15min do que em 2 semanas.",
      tag: "Discovery",
      highlight: true,
    },
    {
      title: '1. "Me fala um pouco sobre o negócio de vocês — o que vocês vendem e para quem é o público principal?"',
      body: "Objetivo: Entender nicho e produto. Deixe o prospect falar. Anote o nicho, tipo de produto e público-alvo.",
      tag: "Pergunta",
    },
    {
      title: '2. "Qual a plataforma de e-commerce que vocês usam hoje?"',
      body: "Objetivo: Avaliar integrabilidade técnica. Shopify, VTEX, Nuvemshop são ótimos. Plataformas próprias podem ser mais complexas.",
      tag: "Pergunta",
    },
    {
      title: '3. "Vocês têm uma base de clientes cadastrada? Tem ideia de quantos clientes únicos estão na base?"',
      body: "Objetivo: Entender o tamanho da oportunidade. Base > 3.000 é o mínimo para valer a pena. Quanto maior, melhor o ROI.",
      tag: "Pergunta",
    },
    {
      title: '4. "Com que frequência um cliente típico volta a comprar de vocês?"',
      body: "Objetivo: Entender o ciclo de recompra. Produtos com recompra natural (cosméticos, pet, alimentos) são ideais.",
      tag: "Pergunta",
    },
    {
      title: '5. "Vocês fazem alguma ação de retenção hoje? Email marketing, WhatsApp, alguma ferramenta?"',
      body: "Objetivo: Entender maturidade e comparativo. Se já usam algo, pergunte os resultados. Se não usam nada, a dor é maior.",
      tag: "Pergunta",
    },
    {
      title: '6. "O que acontece com um cliente que comprou e não voltou mais? Tem alguma ação para reativar?"',
      body: "Objetivo: Dor principal da Retentio. A maioria vai dizer \"nada\". Esse é o momento de ouro para mostrar o problema.",
      tag: "Pergunta",
      highlight: true,
    },
    {
      title: '7. "Quem cuida da parte de marketing e CRM na empresa? Você mesmo ou tem alguém?"',
      body: "Objetivo: Identificar decisor e influenciador. Se o interlocutor não é o decisor, pergunte como envolver essa pessoa.",
      tag: "Pergunta",
    },
    {
      title: '8. "Se vocês conseguissem trazer de volta 20% dos clientes inativos, qual seria o impacto no faturamento?"',
      body: "Objetivo: Fazer o cliente calcular o próprio problema. Deixe ELE falar o número. Isso cria urgência interna.",
      tag: "Pergunta",
      highlight: true,
    },
    {
      title: '9. "O que impediria vocês de investir nisso agora?"',
      body: "Objetivo: Antecipação de objeções. Preço? Timing? Prioridades? Melhor saber agora do que no final do processo.",
      tag: "Pergunta",
    },
    {
      title: '10. "Faz sentido eu preparar uma análise da base de vocês para mostrar o potencial?"',
      body: "Objetivo: Próximo passo concreto. Sem compromisso. Se disser sim, é um sinal fortíssimo de interesse.",
      tag: "Pergunta",
      highlight: true,
    },
    {
      title: "Sinais de que vale avançar",
      body: "Base > 3.000 clientes\nProduto com recompra natural\nDecisor na conversa\nReconhece que tem clientes inativos\nPerguntou sobre preço ou próximos passos",
      tag: "Discovery",
      highlight: true,
    },
    {
      title: "Sinais de que NÃO vale avançar",
      body: "Base < 1.000 clientes\nProduto de compra única (ex: imóvel, casamento)\nSem ERP ou planilha básica\nNão sabe quantos clientes tem\n\"A gente não faz nada com a base e não vejo necessidade\"",
      tag: "Discovery",
    },
  ],
};

// ─── Component ──────────────────────────────────────────────────────

export default function GlossarioPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("metodologia");
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const categoryItems = GLOSSARY[activeCategory];
    if (!search.trim()) return categoryItems;
    const q = search.toLowerCase();
    return categoryItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q)
    );
  }, [activeCategory, search]);

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory)!;
  const ActiveIcon = activeCat.icon;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:px-6 lg:py-4">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Glossário</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">
            Metodologia, siglas, boas práticas e roteiro de discovery
          </p>
        </div>
      </div>

      {/* Mobile category tabs */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-border bg-surface px-3 py-1.5">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSearch(""); }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "bg-surface-raised text-muted-foreground"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Mobile search */}
      <div className="lg:hidden px-4 py-2 border-b border-border bg-surface">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar termos..."
            className="w-full rounded-lg border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav — desktop only */}
        <div className="hidden lg:block w-56 shrink-0 border-r border-border bg-surface p-4 space-y-1 overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearch(""); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm">{cat.label}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-3xl mx-auto space-y-4 lg:space-y-6">
            {/* Search + category header — desktop only */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <ActiveIcon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{activeCat.label}</h2>
                  <p className="text-xs text-muted-foreground">{activeCat.description}</p>
                </div>
              </div>
              <div className="ml-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar termos..."
                  className="rounded-lg border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-64"
                />
              </div>
            </div>

            {/* Items */}
            <GlossaryCategoryList items={items} search={search} />
          </div>
        </div>
      </div>
    </div>
  );
}
