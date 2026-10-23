import { v, type Infer } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { Situation } from "../profile";
import { dirpfDeadline } from "./rules/dueOn";

export const instructions = v.object({
  portal: v.object({ name: v.string(), url: v.string() }),
  access: v.string(),
  documents: v.array(v.string()),
  steps: v.array(v.string()),
  deadline: v.object({ text: v.string(), source: v.string() }),
});

export type Instructions = Infer<typeof instructions>;

const dasDeadline = {
  text: "Até o dia 20 do mês seguinte. Se não for dia útil, vale o próximo dia útil.",
  source: "Resolução CGSN nº 140/2018, art. 40, caput e §3º",
};

const dasMei: Instructions = {
  portal: {
    name: "PGMEI",
    url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao",
  },
  access: "Basta o CNPJ do MEI. Também dá para fazer pelo App MEI.",
  documents: ["CNPJ do MEI"],
  steps: [
    "Informe o CNPJ e confirme o captcha.",
    "Clique em “Emitir Guia de Pagamento (DAS)” e escolha o ano.",
    "Marque o mês desta obrigação.",
    "Clique em “Apurar/Gerar DAS” e depois em “Imprimir/Visualizar PDF”.",
    "Confira se o valor é o mesmo do nosso cálculo e pague pelo código de barras no app do seu banco.",
  ],
  deadline: dasDeadline,
};

const dasSimples: Instructions = {
  portal: {
    name: "Portal do Simples Nacional",
    url: "https://www8.receita.fazenda.gov.br/SimplesNacional/",
  },
  access:
    "CNPJ, CPF do responsável e código de acesso do Simples Nacional, ou a sua conta gov.br pelo e-CAC.",
  documents: [
    "Receita bruta do mês, separada por atividade",
    "Receita bruta de cada um dos 12 meses anteriores",
    "Folha de salários dos 12 meses anteriores, com pró-labore, FGTS e INSS patronal, se a atividade depende do Fator R",
  ],
  steps: [
    "Entre no Portal do Simples Nacional e abra “Cálculo e Declaração” > “PGDAS-D e DEFIS”.",
    "Escolha o período de apuração desta obrigação.",
    "Informe a receita bruta do mês em cada atividade, com os valores do nosso cálculo.",
    "Se a atividade depende do Fator R, informe a folha de salários dos 12 meses anteriores.",
    "Confira se o valor é o mesmo do nosso cálculo, clique em “Transmitir” e depois em “Gerar DAS”.",
    "Pague o DAS pelo código de barras no app do seu banco.",
  ],
  deadline: {
    text: "Declaração e pagamento até o dia 20 do mês seguinte. Se não for dia útil, o pagamento vale até o próximo dia útil.",
    source: `${dasDeadline.source}; art. 38, §2º, II`,
  },
};

const carneLeao: Instructions = {
  portal: {
    name: "Carnê-Leão Web",
    url: "https://cav.receita.fazenda.gov.br/autenticacao/login/index/10028",
  },
  access: "Conta gov.br nível prata ou ouro.",
  documents: [
    "Comprovante de cada recebimento do exterior, com a data e o valor em dólar",
    "Contrato ou invoice de cada pagamento recebido",
    "Comprovantes do INSS e da pensão alimentícia pagos no mês, se houver",
  ],
  steps: [
    "Entre no e-CAC e abra “Declarações e Demonstrativos” > “Acessar Carnê-Leão”.",
    "Em “Rendimentos”, lance cada recebimento do exterior na data em que você recebeu.",
    "Em “Pagamentos”, lance o INSS e a pensão alimentícia do mês, se houver.",
    "Confira o “Demonstrativo” com os valores do nosso cálculo.",
    "Emita o DARF (código 0190) e pague pelo código de barras no app do seu banco.",
  ],
  deadline: {
    text: "Até o último dia útil do mês seguinte ao recebimento.",
    source: "RIR/2018 (Decreto nº 9.580/2018), art. 123; Lei 8.383/1991, art. 6º",
  },
};

const dirpfDocumentsBySituation: Record<Situation, string[]> = {
  salary: ["Informe de rendimentos de cada empregador, entregue até o fim de fevereiro"],
  foreignIncome: [
    "Registros do Carnê-Leão Web do ano, para importar na declaração",
    "DARFs do carnê-leão (código 0190) pagos no ano",
  ],
  company: [
    "Informe de rendimentos de cada empresa, com pró-labore e lucros distribuídos",
    "Receita bruta do ano do MEI, se você tem um MEI",
  ],
  investments: [
    "Informes de rendimentos de bancos e corretoras",
    "Notas de corretagem e DARFs de renda variável (código 6015)",
  ],
  rent: [
    "Contratos e recibos de aluguel",
    "Informe de rendimentos do inquilino, se for uma empresa",
  ],
  dependents: ["CPF de cada dependente", "Recibos de despesas médicas e de educação de cada um"],
};

function dirpf(anoCalendario: number, situations: Situation[]): Instructions {
  return {
    portal: {
      name: "Meu Imposto de Renda ou o programa do IRPF",
      url: "https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/download/pgd/dirpf",
    },
    access:
      "Conta gov.br nível prata ou ouro para usar o Meu Imposto de Renda e a declaração pré-preenchida. Com ganho de capital ou renda variável, use o programa do IRPF.",
    documents: [
      "Declaração e recibo do ano anterior",
      ...situations.flatMap((situation) => dirpfDocumentsBySituation[situation]),
      "Dados da conta para restituição ou débito automático",
    ],
    steps: [
      "Comece pela declaração pré-preenchida, ou pela cópia da declaração do ano anterior.",
      "Confira cada informação com os seus documentos e complete o que faltar.",
      "Se você recolheu carnê-leão, importe os dados do Carnê-Leão Web.",
      "Transmita a declaração e guarde o recibo.",
      "Se houver imposto a pagar, emita o DARF (código 0211) em quota única ou em até 8 quotas.",
    ],
    deadline: dirpfDeadline(anoCalendario),
  };
}

export function instructionsFor(obligation: Doc<"obligations">, situations: Situation[]) {
  if (obligation.kind === "dirpf") return dirpf(obligation.anoCalendario, situations);
  return { dasMei, dasSimples, carneLeao }[obligation.kind];
}
