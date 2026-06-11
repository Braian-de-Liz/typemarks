# RELATÓRIO DE ENGENHARIA: ANÁLISE DE PERFORMANCE DO SUBSISTEMA DE VALIDAÇÃO

## Sumário Executivo

Este relatório consolidado documenta os testes de carga realizados no subsistema de validação de esquemas da API, avaliando **8 cenários distintos** que combinam diferentes runtimes (Node.js/Bun), frameworks (Fastify/Elysia) e bibliotecas de validação (AJV/Schema-Shield/Zod/TypeBox/Typia). Todos os testes foram executados no mesmo hardware, com o mesmo payload JSON complexo, sob 100 conexões simultâneas durante 10 segundos por rodada.

### Tabela Mestra — Ranking Consolidado

| # | Runtime | Framework | Validador | Req/s (Média) | Lat. Média | Lat. P99 | Δ vs Topo |
|---|---------|-----------|-----------|---------------|------------|----------|-----------|
| 1 | Bun (JSC) | Elysia | TypeBox | 25.915,20 | 3,45 ms | 6,60 ms | — (referência) |
| 2 | Bun (JSC) | Fastify | AJV | 22.527,44 | 3,93 ms | 8,60 ms | -13,1% |
| 3 | Bun (JSC) | Fastify | Typia | 22.450,64 | 3,90 ms | 8,40 ms | -13,4% |
| 4 | Bun (JSC) | Fastify | Schema-Shield | 21.106,48 | 4,23 ms | 8,60 ms | -18,6% |
| 5 | Bun (JSC) | Fastify | Zod | 20.379,76 | 4,42 ms | 9,40 ms | -21,4% |
| 6 | Node (V8) | Fastify | AJV | 15.566,64 | 6,08 ms | 12,60 ms | -39,9% |

---

## Parte I — Isolamento de Runtime: Node.js (V8) vs Bun (JavaScriptCore)

### Objetivo

Avaliar o desempenho bruto e isolado do validador AJV (integrado ao Fastify) comparando os dois principais runtimes: Node.js (Motor V8) e Bun (Motor JavaScriptCore). O experimento foi conduzido em repositório limpo para remover gargalos colaterais.

### Metodologia

- Infraestrutura desacoplada: sem middlewares, bancos de dados ou barramentos de eventos
- Parâmetros fixos: 100 conexões simultâneas, 10 segundos de duração
- Payload JSON tridimensional com UUIDs, Regex, arrays aninhados e `additionalProperties: false`
- 5 rodadas consecutivas por runtime

### Resultados

#### Fastify + AJV no Node.js (V8)

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 13.341,60 | 6,97 ms | 14,00 ms | 2,34 MB/s |
| 2 | 15.168,80 | 6,18 ms | 13,00 ms | 2,66 MB/s |
| 3 | 16.368,40 | 5,79 ms | 12,00 ms | 2,88 MB/s |
| 4 | 16.486,80 | 5,72 ms | 12,00 ms | 2,90 MB/s |
| 5 | 16.467,60 | 5,78 ms | 12,00 ms | 2,89 MB/s |
| **Média** | **15.566,64** | **6,08 ms** | **12,60 ms** | **2,73 MB/s** |

#### Fastify + AJV no Bun (JSC)

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 22.281,60 | 3,98 ms | 9,00 ms | 2,85 MB/s |
| 2 | 22.459,20 | 3,95 ms | 9,00 ms | 2,87 MB/s |
| 3 | 22.382,40 | 3,96 ms | 9,00 ms | 2,86 MB/s |
| 4 | 22.530,00 | 3,92 ms | 8,00 ms | 2,88 MB/s |
| 5 | 22.984,00 | 3,83 ms | 8,00 ms | 2,94 MB/s |
| **Média** | **22.527,44** | **3,93 ms** | **8,60 ms** | **2,88 MB/s** |

### Análise

| Métrica | Node.js (V8) | Bun (JSC) | Diferença | Veredito |
|---------|-------------|-----------|-----------|----------|
| Throughput | 15.566,64 rps | 22.527,44 rps | **Bun +44,71%** | Vantagem Clara do Bun |
| Latência Média | 6,08 ms | 3,93 ms | **Bun -35,36%** | Bun Mais Rápido |
| Estabilidade P99 | 12,60 ms | 8,60 ms | **Bun -31,74%** | Bun Mais Consistente |
| Vazão de Rede | 2,73 MB/s | 2,88 MB/s | **Bun +5,49%** | Bun Mais Eficiente |

#### Curva de Aquecimento JIT

O Node.js evidenciou perfeitamente o aquecimento do compilador JIT (TurboFan): o throughput saltou de **13.341 rps** (rodada 1) para ~**16.468 rps** (rodada 5) — incremento de +23,5% conforme o V8 compilava os hot paths do AJV. Em contrapartida, o Bun iniciou o teste imediatamente em seu pico máximo (**22.281 rps**), indicando otimização de inicialização muito mais agressiva do JavaScriptCore.

#### Garbage Collector sob Carga

A latência P99 do Bun permaneceu blindada entre 8-9 ms, enquanto o Node flutuou entre 12-14 ms. Essa diferença de ~31% prova que o gerenciamento de memória do JSC interrompe menos a thread principal sob estresse contínuo.

---

## Parte II — Matriz de Frameworks e Validadores no Bun

### Objetivo

Analisar o impacto de desempenho de diferentes combinações de frameworks backend (Fastify e Elysia) e bibliotecas de validação (AJV, TypeBox, Schema-Shield, Zod e Typia) — todos rodando exclusivamente no runtime Bun.

### Metodologia

- Runtime: Bun v1.3.14
- 100 conexões simultâneas, 10s por rodada
- 5 rodadas consecutivas por cenário
- Payload homogêneo (POST /StronValid)
- Isolamento total (sem banco de dados ou middlewares externos)

### Resultados

#### Cenário A: Fastify + AJV

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 22.281,60 | 3,98 ms | 9,00 ms | 2.852.044,80 |
| 2 | 22.459,20 | 3,95 ms | 9,00 ms | 2.874.777,60 |
| 3 | 22.382,40 | 3,96 ms | 9,00 ms | 2.864.947,20 |
| 4 | 22.530,00 | 3,92 ms | 8,00 ms | 2.883.840,00 |
| 5 | 22.984,00 | 3,83 ms | 8,00 ms | 2.941.952,00 |
| **Média** | **22.527,44** | **3,93 ms** | **8,60 ms** | **2.883.512,32** |

#### Cenário B: Elysia + TypeBox (Nativo)

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 25.392,00 | 3,51 ms | 7,00 ms | 3.224.576,00 |
| 2 | 25.912,00 | 3,45 ms | 6,00 ms | 3.290.316,80 |
| 3 | 26.081,60 | 3,44 ms | 6,00 ms | 3.312.435,20 |
| 4 | 26.072,00 | 3,46 ms | 7,00 ms | 3.310.796,80 |
| 5 | 26.118,40 | 3,39 ms | 7,00 ms | 3.317.145,60 |
| **Média** | **25.915,20** | **3,45 ms** | **6,60 ms** | **3.291.054,08** |

#### Cenário C: Fastify + Schema-Shield

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 22.052,40 | 4,02 ms | 8,00 ms | 2.822.707,20 |
| 2 | 20.770,00 | 4,31 ms | 9,00 ms | 2.658.560,00 |
| 3 | 20.753,20 | 4,31 ms | 8,00 ms | 2.656.409,60 |
| 4 | 20.812,41 | 4,31 ms | 9,00 ms | 2.663.987,21 |
| 5 | 21.144,40 | 4,22 ms | 9,00 ms | 2.706.483,20 |
| **Média** | **21.106,48** | **4,23 ms** | **8,60 ms** | **2.701.629,44** |

#### Cenário D: Fastify + Typia (validação inline via `typia.assert()`)

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 21.910,40 | 3,99 ms | 8,00 ms | 2.804.531,20 |
| 2 | 22.171,20 | 3,94 ms | 8,00 ms | 2.837.913,60 |
| 3 | 22.670,80 | 3,88 ms | 9,00 ms | 2.901.862,40 |
| 4 | 22.601,60 | 3,87 ms | 8,00 ms | 2.893.004,80 |
| 5 | 22.899,20 | 3,84 ms | 9,00 ms | 2.931.097,60 |
| **Média** | **22.450,64** | **3,90 ms** | **8,40 ms** | **2.873.681,92** |

#### Cenário E: Fastify + Zod

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 20.021,20 | 4,51 ms | 10,00 ms | 2.562.713,60 |
| 2 | 20.452,41 | 4,40 ms | 10,00 ms | 2.617.907,21 |
| 3 | 20.162,00 | 4,48 ms | 9,00 ms | 2.580.736,00 |
| 4 | 20.722,00 | 4,33 ms | 9,00 ms | 2.652.416,00 |
| 5 | 20.541,20 | 4,36 ms | 9,00 ms | 2.629.273,60 |
| **Média** | **20.379,76** | **4,42 ms** | **9,40 ms** | **2.608.609,28** |

### Análise Consolidada

| Métrica | Elysia (TypeBox) | Fastify + AJV | **Fastify + Typia** | Fastify + Shield | Fastify + Zod |
|---------|-----------------|---------------|-------------------|------------------|---------------|
| Throughput | **25.915,20** rps | 22.527,44 rps | 22.450,64 rps | 21.106,48 rps | 20.379,76 rps |
| Latência Média | **3,45 ms** | 3,93 ms | **3,90 ms** | 4,23 ms | 4,42 ms |
| Estabilidade P99 | **6,60 ms** | 8,60 ms | **8,40 ms** | 8,60 ms | 9,40 ms |
| Vazão de Rede | **3,29 MB/s** | 2,88 MB/s | 2,87 MB/s | 2,70 MB/s | 2,61 MB/s |

#### Observações

- **Elysia + TypeBox** consagrou-se campeão absoluto ao quebrar a barreira de 25k req/s. A sinergia nativa com `Bun.serve()` e a pré-compilação estática de esquemas eliminam a sobrecarga estrutural de camadas adaptativas.
- **Fastify + AJV** demonstrou maturidade de engenharia: mesmo rodando sob camada adaptativa fora do Node.js, a compilação JIT em funções planas garantiu o segundo lugar com latência média < 4ms.
- **Fastify + Typia** alcançou paridade virtual com o AJV (~22.451 vs 22.527 req/s, diferença de ~0,3%), mesmo realizando a validação inline via `typia.assert()` dentro do handler da rota — sem utilizar o schema compiler otimizado do Fastify. A latência P99 ligeiramente menor (8,40 ms vs 8,60 ms) sugere maior previsibilidade do código gerado estaticamente pelo typia. Este resultado é particularmente relevante porque o typia não depende de `new Function` ou compilação JIT, operando via transformação em tempo de transpilação pura.
- **Schema-Shield**, com validação estrutural interpretativa sem compilação dinâmica, posicionou-se no meio da tabela. Sua latência P99 emparelhou com o AJV (8,60 ms), mas o throughput ficou ~6% abaixo do AJV e ~6,4% abaixo do Typia.
- **Zod** expôs o preço do parsing dinâmico sem compilação prévia: o `.safeParse()` caminha recursivamente pelo payload a cada requisição, resultando na posição mais baixa e na maior cauda de latência P99 (9,40 ms).

---

## Parte III — Deep Dive: AJV vs Schema-Shield com Hook de Autenticação JWT

### Objetivo

Avaliar o impacto real de desempenho ao alternar o motor de validação do Fastify 5 entre AJV (compilação dinâmica) e Schema-Shield (abordagem interpretativa estática), com um hook global de JWT **ativo e validando assinaturas** em todas as requisições.

### Contexto

Historicamente, o AJV gera código em tempo de execução (`new Function`) para compilar esquemas JSON em funções JavaScript puras. No ecossistema Node.js (V8), isso garante performance extrema via JIT. Havia a hipótese de que, ao migrar para o Bun (JavaScriptCore), a geração dinâmica de código causaria desotimizações severas — hipótese que este teste refutou.

### Resultados

#### Schema-Shield + JWT Ativo

| Rodada | Req/s | Lat. Média | P99 |
|--------|-------|------------|-----|
| 1 | 14.877,60 | 6,20 ms | 12,00 ms |
| 2 | 15.087,20 | 6,10 ms | 11,00 ms |
| 3 | 15.122,40 | 6,09 ms | 12,00 ms |
| 4 | 15.009,60 | 6,13 ms | 11,00 ms |
| 5 | 15.028,80 | 6,13 ms | 11,00 ms |
| **Média** | **15.025,12** | **6,13 ms** | **11,40 ms** |

#### AJV + JWT Ativo

| Rodada | Req/s | Lat. Média | P99 |
|--------|-------|------------|-----|
| 1 | 16.557,20 | 5,58 ms | 11,00 ms |
| 2 | 16.468,80 | 5,61 ms | 11,00 ms |
| 3 | 16.604,80 | 5,58 ms | 10,00 ms |
| 4 | 16.590,41 | 5,56 ms | 10,00 ms |
| 5 | 16.472,00 | 5,62 ms | 11,00 ms |
| **Média** | **16.538,68** | **5,59 ms** | **10,40 ms** |

### Análise

| Métrica | Schema-Shield | AJV | Vencedor |
|---------|--------------|-----|----------|
| Requisições/s | 15.025,12 | 16.538,68 | AJV (+10,07%) |
| Latência Média | 6,13 ms | 5,59 ms | AJV (-8,81%) |
| P99 | 11,40 ms | 10,40 ms | AJV (mais estável) |
| Throughput | 2,48 MB/s | 2,73 MB/s | AJV (+10,08%) |
| Erros/Timeouts | 0 / 0 | 0 / 0 | Empate |

#### Por que o AJV venceu no Bun?

1. **Diluição do custo de cold start:** a penalidade de CPU do `new Function` nos primeiros milissegundos tornou-se irrelevante em testes de 10s contínuos. Uma vez compilado, o código plano executa em velocidade máxima.
2. **Maturidade do JIT do Bun:** o JSC evoluiu drasticamente nas versões recentes do Bun, otimizando eficientemente o código gerado dinamicamente pelo AJV.

### Recomendação Arquitetural

- **Servidor Dedicado / Container (longo prazo):** Manter AJV. O ganho de 10% em throughput escala melhor sob alta concorrência.
- **Edge / Serverless (curto ciclo de vida):** Schema-Shield é preferível para mitigar cold starts repetitivos em ambientes como Cloudflare Workers.

---

## Conclusão e Recomendações

### Stack Recomendada

Com base nos dados empíricos consolidados, a stack de maior performance para o subsistema de validação é:

> **Runtime:** Bun (JavaScriptCore)
> **Framework:** Elysia
> **Validador:** TypeBox (validação nativa)
> **Benchmark:** 25.915 req/s | Latência Média 3,45 ms | P99 6,60 ms

O Elysia consagrou-se campeão absoluto dos benchmarks por abdicar de camadas de compatibilidade do Node.js, acoplando-se diretamente ao `Bun.serve()` com pré-compilação estática de esquemas via TypeBox. O Fastify+AJV (segundo lugar) e o Fastify+Typia (terceiro lugar, com diferença marginal de ~0,3%) demonstram que o ecossistema Bun amadureceu a ponto de executar tanto código gerado dinamicamente (`new Function`) quanto código transformado estaticamente (typia) com desempenho superior ao Node.js nativo.

### Custo da Validação na Arquitetura

Considerando benchmarks de rota vazia (Hello World) onde o Bun atinge ~58.4k req/s, a introdução do esquema complexo reduziu a vazão para ~22.5k req/s (Fastify+AJV). Isso isola com precisão o custo da validação de contratos de dados: **aproximadamente 61% da capacidade de processamento** é consumida pela segurança de tipos em payloads severos — tornando a escolha do runtime e do validador um fator crítico para a saúde financeira e de hardware da infraestrutura.

### Próximos Passos Recomendados

1. **Perfilamento de memória (heap profiling):** monitorar o comportamento de alocação sob estresse contínuo de 60s para mensurar o impacto do GC em cada validador.
2. **Simulação de gargalo misto:** adicionar atraso assíncrono artificial (I/O delay de 20ms) nas rotas para verificar se as diferenças percentuais se mantêm ou se diluem diante de espera de rede.
3. **Expansão da matriz de testes:** incluir validação com `@sinclair/typebox` puro (sem Elysia) e testes com `typia` integrado ao schema compiler do Fastify para avaliar o ganho potencial de performance.

---

## Apêndice — Metodologia e Parâmetros

### Payload de Teste

Payload JSON de telemetria musical complexo e aninhado, simulando dados reais de análise de frequências e camadas:

- Tipos validados: UUIDs (formato estrito), inteiros com limites, strings com Regex de formatos de áudio, arrays dinâmicos, objetos aninhados com até 20 sub-itens
- `additionalProperties: false` em todos os objetos para rigor máximo

### Configuração do Ambiente

- **Hardware:** mesmo equipamento para todos os testes
- **Ferramenta de carga:** Autocannon
- **Parâmetros:** 100 conexões simultâneas, 10s de duração, método POST
- **Amostragem:** 5 rodadas consecutivas por cenário
- **Runtimes testados:** Node.js 22.13.0 e Bun v1.3.14
- **Testes executados via:** `bun test` (nativo) e `vitest` (Node.js)

### Repositório

Todo o código-fonte dos benchmarks está disponível no repositório [typemarks](https://github.com/braiandsl/typemarks).

---

**Responsável Técnico:** Braian de Liz da Silva / Pesquisa & Desenvolvimento  
**Data do Relatório:** 11 de junho de 2026
