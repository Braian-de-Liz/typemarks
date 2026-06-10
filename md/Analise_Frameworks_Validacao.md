# RELATÓRIO TÉCNICO: ANÁLISE DE FRAMEWORKS E ESTRATÉGIAS DE VALIDAÇÃO EM AMBIENTE BUN

## 1. Objetivo

Este relatório analisa o impacto de desempenho, latência e vazão de rede de diferentes combinações de frameworks backend (Fastify e Elysia) e bibliotecas de validação de esquemas (AJV, TypeBox Nativo, Schema-Shield e Zod). O experimento foi executado inteiramente sob o runtime Bun dentro de um repositório isolado (typemarks) para traçar uma matriz comparativa de arquitetura pura, removendo gargalos de infraestrutura externa.

## 2. Metodologia de Isolamento

Para garantir a integridade e precisão científica das métricas, eliminando variações térmicas ou oscilações temporárias de CPU do sistema operacional, o ambiente seguiu regras estritas:

- **Infraestrutura Desacoplada:** Isolamento total das rotas HTTP, sem conexões com bancos de dados, microsserviços ou middlewares de terceiros.
- **Parâmetros de Carga Fixos:** Simulação contínua de carga gerada via suíte de testes com 100 conexões simultâneas durante o período estrito de 10 segundos por bateria.
- **Cenário de Estresse Homogêneo:** Requisições do tipo `POST /StronValid` transmitindo rigorosamente o mesmo payload complexo (contendo regras de UUID, expressões regulares padrão, limites numéricos e arrays aninhados).
- **Amostragem Expandida:** Execução de 5 rodadas consecutivas para cada um dos 4 cenários, permitindo o aquecimento completo do motor de execução, estabilização dos compiladores internos e avaliação do comportamento do Garbage Collector.

## 3. Dados Coletados (Métricas Brutas)

### 3.1. Cenário A: Fastify + AJV (Runtime Bun v1.3.14)

| Rodada | Requisições/s | Latência Média | Latência P99 | Throughput (bytes) |
|--------|---------------|----------------|--------------|-------------------|
| #1 | 22.281,60 | 3,98 ms | 9,00 ms | 2.852.044,80 |
| #2 | 22.459,20 | 3,95 ms | 9,00 ms | 2.874.777,60 |
| #3 | 22.382,40 | 3,96 ms | 9,00 ms | 2.864.947,20 |
| #4 | 22.530,00 | 3,92 ms | 8,00 ms | 2.883.840,00 |
| #5 | 22.984,00 | 3,83 ms | 8,00 ms | 2.941.952,00 |
| **Média** | **~22.527,44** | **3,93 ms** | **8,60 ms** | **2.883.512,32** |

### 3.2. Cenário B: Elysia + TypeBox Nativo (Runtime Bun v1.3.14)

| Rodada | Requisições/s | Latência Média | Latência P99 | Throughput (bytes) |
|--------|---------------|----------------|--------------|-------------------|
| #1 | 25.392,00 | 3,51 ms | 7,00 ms | 3.224.576,00 |
| #2 | 25.912,00 | 3,45 ms | 6,00 ms | 3.290.316,80 |
| #3 | 26.081,60 | 3,44 ms | 6,00 ms | 3.312.435,20 |
| #4 | 26.072,00 | 3,46 ms | 7,00 ms | 3.310.796,80 |
| #5 | 26.118,40 | 3,39 ms | 7,00 ms | 3.317.145,60 |
| **Média** | **~25.915,20** | **3,45 ms** | **6,60 ms** | **3.291.054,08** |

### 3.3. Cenário C: Fastify + Schema-Shield (Runtime Bun v1.3.14)

| Rodada | Requisições/s | Latência Média | Latência P99 | Throughput (bytes) |
|--------|---------------|----------------|--------------|-------------------|
| #1 | 22.052,40 | 4,02 ms | 8,00 ms | 2.822.707,20 |
| #2 | 20.770,00 | 4,31 ms | 9,00 ms | 2.658.560,00 |
| #3 | 20.753,20 | 4,31 ms | 8,00 ms | 2.656.409,60 |
| #4 | 20.812,41 | 4,31 ms | 9,00 ms | 2.663.987,21 |
| #5 | 21.144,40 | 4,22 ms | 9,00 ms | 2.706.483,20 |
| **Média** | **~21.106,48** | **4,23 ms** | **8,60 ms** | **2.701.629,44** |

### 3.4. Cenário D: Fastify + Zod - Validação Real (Runtime Bun v1.3.14)

| Rodada | Requisições/s | Latência Média | Latência P99 | Throughput (bytes) |
|--------|---------------|----------------|--------------|-------------------|
| #1 | 20.021,20 | 4,51 ms | 10,00 ms | 2.562.713,60 |
| #2 | 20.452,41 | 4,40 ms | 10,00 ms | 2.617.907,21 |
| #3 | 20.162,00 | 4,48 ms | 9,00 ms | 2.580.736,00 |
| #4 | 20.722,00 | 4,33 ms | 9,00 ms | 2.652.416,00 |
| #5 | 20.541,20 | 4,36 ms | 9,00 ms | 2.629.273,60 |
| **Média** | **~20.379,76** | **4,42 ms** | **9,40 ms** | **2.608.609,28** |

## 4. Análise e Consolidação Estatística

Extraindo a média aritmética exata das 5 rodadas consecutivas de cada ecossistema, consolidou-se a seguinte matriz de performance:

| Métrica de Performance | Média Elysia (TypeBox) | Média Fastify + AJV | Média Fastify + Schema-Shield | Média Fastify + Zod | Margem de Diferença Absoluta |
|------------------------|------------------------|---------------------|------------------------------|---------------------|------------------------------|
| Throughput (Req/Sec) | 25.915,20 rps | 22.527,44 rps | 21.106,48 rps | 20.379,76 rps | Elysia mais veloz (+15,04% vs AJV / +22,78% vs Shield / +27,16% vs Zod) |
| Latência Média | 3,45 ms | 3,93 ms | 4,23 ms | 4,42 ms | Elysia mais responsivo (-12,2% vs AJV / -18,4% vs Shield / -21,9% vs Zod) |
| Estabilidade P99 | 6,60 ms | 8,60 ms | 8,60 ms | 9,40 ms | Elysia menor cauda de latência (-23,2% vs AJV / -23,2% vs Shield) |
| Vazão de Rede Média | 3,29 MB/s | 2,88 MB/s | 2,70 MB/s | 2,61 MB/s | Elysia maior eficiência na entrega de dados |

## 5. Conclusões e Descobertas de Engenharia

A consolidação dos dados reais trouxe revelações cruciais sobre a arquitetura de validação no ecossistema TypeScript moderno:

**Sinergia Nativa do Elysia com o Core do Bun:** O Elysia consagrou-se como o campeão indiscutível do benchmark, quebrando a barreira das 25k req/s. Esse ganho drástico ocorre porque o Elysia abdica de camadas de compatibilidade do Node.js, acoplando-se diretamente ao `Bun.serve()`. Aliado ao TypeBox, ele pré-compila esquemas de forma estática antes de abrir a escuta da porta HTTP, gerando caminhos de execução diretos na memória sem sobrecarga estrutural.

**A Eficiência JIT do AJV:** O Fastify combinado ao AJV demonstrou sua alta maturidade de engenharia. Mesmo rodando sob uma camada adaptativa fora de seu ambiente Node.js nativo, a estratégia do AJV de compilar esquemas JSON dinamicamente em funções JavaScript puras (Just-In-Time) garantiu o segundo lugar absoluto, sustentando uma latência média inferior a 4ms.

**O Desempenho Intermediário do Schema-Shield:** O Schema-Shield, utilizando validação estrutural interpretativa sem compilação dinâmica, posicionou-se no meio da tabela com ~21.106 req/s. Sua abordagem estática eliminou o custo de inicialização (cold start) observado em validadores JIT, mas não conseguiu superar a eficiência do código compilado plano do AJV durante regime contínuo de carga. A latência P99 emparelhou com o AJV (8,60 ms), indicando comportamento previsível sob estresse.

**O Custo Computacional do Zod em Runtime:** O teste real com o Zod expôs de forma cirúrgica o preço do parsing dinâmico sem compilação. Como o Zod não possui etapa de compilação prévia de rotas, seu método `.safeParse()` é forçado a caminhar recursivamente por cada ramificação do payload recebido a cada nova requisição HTTP. Esse comportamento consome ciclos adicionais de CPU, justificando a posição mais baixa da tabela (~20.379 req/s) e a cauda de latência P99 mais elevada (9,40 ms).

**Viabilidade de Mercado:** Apesar das diferenças de desempenho, todos os quatro cenários operaram sem erros ou timeouts, sustentando taxas acima de 20.000 req/s. Para cenários corporativos onde o gargalo principal está em I/O (consultas de banco de dados ou chamadas de APIs externas), a escolha do validador deve priorizar a Experiência de Desenvolvimento (DX) e a maturidade do ecossistema, em vez da performance bruta de CPU isolada.

### 5.1. Próximos Passos Recomendados

Para finalizar a governança e padronização arquitetural da empresa, este comitê recomenda:

- **Perfilamento de Memória (Memory Profiling):** Monitorar o comportamento de alocação de memória (Heap) dos três cenários sob estresse contínuo de 60 segundos para mensurar a frequência de atuação e o impacto do Garbage Collector do Bun em cada validador.

- **Simulação de Gargalo Misto:** Adicionar um atraso artificial assíncrono (I/O delay de 20ms) nas rotas para simular o comportamento real de uma aplicação em produção e verificar se a distância percentual de performance entre os validadores se mantém ou se dilui diante da espera de rede.

---

**Responsável Técnico:** Braian de Liz da Silva / Pesquisa & Desenvolvimento
**Data do Relatório:** 10 de junho de 2026
