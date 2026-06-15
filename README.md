# RELATÓRIO DE ENGENHARIA: ANÁLISE DE PERFORMANCE DO SUBSISTEMA DE VALIDAÇÃO

## Sumário Executivo

Este relatório consolidado documenta os testes de carga realizados no subsistema de validação de esquemas da API, avaliando **12 cenários distintos** que combinam diferentes runtimes (Node.js/Bun), frameworks (Fastify/Elysia) e bibliotecas de validação (AJV/Schema-Shield/Zod/TypeBox/Typia/Yup/Valibot). Todos os testes foram executados no mesmo hardware, com o mesmo payload JSON complexo, sob 100 conexões simultâneas durante 10 segundos por rodada.

### Tabela Mestra — Ranking Consolidado

| # | Runtime | Framework | Validador | Req/s (Média) | Lat. Média | Lat. P99 | Δ vs Topo (Geral) |
|---|---------|-----------|-----------|---------------|------------|----------|-------------------|
| 1 | Bun (JSC) | Elysia | TypeBox | 25.915,20 | 3,45 ms | 6,60 ms | — (referência) |
| 2 | Bun (JSC) | Fastify | AJV | 22.527,44 | 3,93 ms | 8,60 ms | -13,1% |
| 3 | Bun (JSC) | Fastify | Typia | 22.450,64 | 3,90 ms | 8,40 ms | -13,4% |
| 4 | Bun (JSC) | Fastify | Schema-Shield | 21.106,48 | 4,23 ms | 8,60 ms | -18,6% |
| 5 | Bun (JSC) | Fastify | Zod | 20.379,76 | 4,42 ms | 9,40 ms | -21,4% |
| 6 | Node (V8) | Fastify | AJV | 14.998,08 | 6,16 ms | 14,20 ms | -42,1% |
| 7 | Node (V8) | Fastify | Typia | 14.755,28 | 6,26 ms | 14,80 ms | -43,1% |
| 8 | Node (V8) | Fastify | Schema-Shield | 14.500,80 | 6,40 ms | 14,20 ms | -44,0% |
| 9 | Node (V8) | Fastify | Valibot | 14.114,88 | 6,58 ms | 14,20 ms | -45,5% |
| 10 | Node (V8) | Fastify | Zod | 13.754,24 | 6,80 ms | 15,00 ms | -46,9% |
| 11 | Bun (JSC) | Fastify | Yup | 6.192,00 | 15,76 ms | 22,60 ms | -76,1% |
| 12 | Node (V8) | Fastify | Yup | 5.974,26 | 16,35 ms | 31,00 ms | -76,9% |

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

#### Cenário F: Fastify + Yup

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 6.152,00 | 15,88 ms | 22,00 ms | 787.456,00 |
| 2 | 6.192,00 | 15,76 ms | 23,00 ms | 792.576,00 |
| 3 | 6.202,00 | 15,71 ms | 22,00 ms | 793.856,00 |
| 4 | 6.202,00 | 15,73 ms | 24,00 ms | 793.856,00 |
| 5 | 6.212,00 | 15,72 ms | 22,00 ms | 795.136,00 |
| **Média** | **6.192,00** | **15,76 ms** | **22,60 ms** | **792.576,00** |

### Análise Consolidada

| Métrica | Elysia (TypeBox) | Fastify + AJV | **Fastify + Typia** | Fastify + Shield | Fastify + Zod | Fastify + Yup |
|---------|-----------------|---------------|-------------------|------------------|---------------|
| Throughput | **25.915,20** rps | 22.527,44 rps | 22.450,64 rps | 21.106,48 rps | 20.379,76 rps | 6.192,00 rps |
| Latência Média | **3,45 ms** | 3,93 ms | **3,90 ms** | 4,23 ms | 4,42 ms | 15,76 ms |
| Estabilidade P99 | **6,60 ms** | 8,60 ms | **8,40 ms** | 8,60 ms | 9,40 ms | 22,60 ms |
| Vazão de Rede | **3,29 MB/s** | 2,88 MB/s | 2,87 MB/s | 2,70 MB/s | 2,61 MB/s | 0,79 MB/s |

#### Observações

- **Elysia + TypeBox** consagrou-se campeão absoluto ao quebrar a barreira de 25k req/s. A sinergia nativa com `Bun.serve()` e a pré-compilação estática de esquemas eliminam a sobrecarga estrutural de camadas adaptativas.
- **Fastify + AJV** demonstrou maturidade de engenharia: mesmo rodando sob camada adaptativa fora do Node.js, a compilação JIT em funções planas garantiu o segundo lugar com latência média < 4ms.
- **Fastify + Typia** alcançou paridade virtual com o AJV (~22.451 vs 22.527 req/s, diferença de ~0,3%), mesmo realizando a validação inline via `typia.assert()` dentro do handler da rota — sem utilizar o schema compiler otimizado do Fastify. A latência P99 ligeiramente menor (8,40 ms vs 8,60 ms) sugere maior previsibilidade do código gerado estaticamente pelo typia. Este resultado é particularmente relevante porque o typia não depende de `new Function` ou compilação JIT, operando via transformação em tempo de transpilação pura.
- **Schema-Shield**, com validação estrutural interpretativa sem compilação dinâmica, posicionou-se no meio da tabela. Sua latência P99 emparelhou com o AJV (8,60 ms), mas o throughput ficou ~6% abaixo do AJV e ~6,4% abaixo do Typia.
- **Zod** expôs o preço do parsing dinâmico sem compilação prévia: o `.safeParse()` caminha recursivamente pelo payload a cada requisição, resultando na posição mais baixa entre os validadores estruturais e na maior cauda de latência P99 (9,40 ms).
- **Yup** apresentou desempenho drasticamente inferior no Bun, com throughput de apenas 6.192 req/s — **70,4% abaixo do Zod** e latência média ~3,6× maior. O wrapping síncrono de schemas e a validação interpretativa sem compilação JIT são os principais fatores. No entanto, a latência P99 (22,60 ms) foi significativamente melhor que no Node.js (31,00 ms), indicando que o JSC do Bun gerencia melhor os picos de validação do Yup.

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

## Parte IV — Matriz de Validadores no Node.js (V8)

### Objetivo

Avaliar o desempenho de todas as bibliotecas de validação (AJV, Zod, Yup, Valibot, Schema-Shield e Typia) rodando exclusivamente no runtime Node.js com o framework Fastify, para comparar diretamente com os resultados obtidos no Bun.

### Metodologia

- Runtime: Node.js (V8)
- Framework: Fastify
- Ferramenta de carga: Autocannon (via Vitest)
- 100 conexões simultâneas, 10s por rodada
- 5 rodadas consecutivas por cenário
- Payload homogêneo (POST /StronValid)
- Isolamento total (sem banco de dados ou middlewares externos)

### Resultados

#### Fastify + AJV no Node.js

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 15.462,40 | 5,99 ms | 14,00 ms | 2.721.126,40 |
| 2 | 15.197,60 | 6,05 ms | 13,00 ms | 2.674.534,40 |
| 3 | 15.176,80 | 6,08 ms | 14,00 ms | 2.671.155,21 |
| 4 | 14.511,20 | 6,34 ms | 16,00 ms | 2.553.702,40 |
| 5 | 14.642,40 | 6,33 ms | 14,00 ms | 2.576.537,60 |
| **Média** | **14.998,08** | **6,16 ms** | **14,20 ms** | **2.639.411,20** |

#### Fastify + Typia no Node.js

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 14.348,00 | 6,42 ms | 15,00 ms | 2.525.030,40 |
| 2 | 14.556,80 | 6,31 ms | 15,00 ms | 2.561.894,40 |
| 3 | 15.800,40 | 5,93 ms | 14,00 ms | 2.780.006,40 |
| 4 | 14.468,00 | 6,36 ms | 15,00 ms | 2.546.227,21 |
| 5 | 14.603,20 | 6,29 ms | 15,00 ms | 2.569.881,60 |
| **Média** | **14.755,28** | **6,26 ms** | **14,80 ms** | **2.596.608,00** |

#### Fastify + Schema-Shield no Node.js

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 13.851,20 | 6,82 ms | 15,00 ms | 2.437.785,60 |
| 2 | 14.972,00 | 6,13 ms | 13,00 ms | 2.634.700,80 |
| 3 | 15.171,20 | 6,08 ms | 14,00 ms | 2.669.824,00 |
| 4 | 14.197,60 | 6,55 ms | 15,00 ms | 2.498.611,21 |
| 5 | 14.312,00 | 6,44 ms | 14,00 ms | 2.518.579,21 |
| **Média** | **14.500,80** | **6,40 ms** | **14,20 ms** | **2.551.900,16** |

#### Fastify + Valibot no Node.js

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 14.712,00 | 6,24 ms | 14,00 ms | 2.589.440,00 |
| 2 | 13.821,60 | 6,79 ms | 15,00 ms | 2.432.460,80 |
| 3 | 14.181,60 | 6,49 ms | 14,00 ms | 2.496.051,21 |
| 4 | 14.100,80 | 6,56 ms | 14,00 ms | 2.481.408,00 |
| 5 | 13.758,40 | 6,82 ms | 14,00 ms | 2.421.196,80 |
| **Média** | **14.114,88** | **6,58 ms** | **14,20 ms** | **2.484.111,36** |

#### Fastify + Zod no Node.js

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 13.331,20 | 7,10 ms | 16,00 ms | 2.346.137,60 |
| 2 | 13.728,00 | 6,78 ms | 15,00 ms | 2.415.769,60 |
| 3 | 14.311,20 | 6,46 ms | 15,00 ms | 2.518.681,60 |
| 4 | 12.972,00 | 7,27 ms | 15,00 ms | 2.282.752,00 |
| 5 | 14.428,80 | 6,41 ms | 14,00 ms | 2.539.059,21 |
| **Média** | **13.754,24** | **6,80 ms** | **15,00 ms** | **2.420.480,00** |

#### Fastify + Yup no Node.js

| Rodada | Req/s | Lat. Média | P99 | Throughput |
|--------|-------|------------|-----|------------|
| 1 | 6.231,60 | 15,63 ms | 30,00 ms | 1.096.473,61 |
| 2 | 6.151,60 | 15,87 ms | 30,00 ms | 1.082.624,00 |
| 3 | 6.021,50 | 16,14 ms | 29,00 ms | 1.059.481,61 |
| 4 | 5.468,30 | 17,87 ms | 35,00 ms | 962.073,60 |
| 5 | 5.998,30 | 16,23 ms | 31,00 ms | 1.055.488,00 |
| **Média** | **5.974,26** | **16,35 ms** | **31,00 ms** | **1.051.228,16** |

### Análise Consolidada

#### Ranking Node.js

| # | Validador | Req/s | Lat. Média | P99 | Δ vs Topo (Node) |
|---|-----------|-------|------------|-----|------------------|
| 1 | **AJV** | **14.998,08** | 6,16 ms | 14,20 ms | — (referência) |
| 2 | Typia | 14.755,28 | 6,26 ms | 14,80 ms | -1,6% |
| 3 | Schema-Shield | 14.500,80 | 6,40 ms | 14,20 ms | -3,3% |
| 4 | Valibot | 14.114,88 | 6,58 ms | 14,20 ms | -5,9% |
| 5 | Zod | 13.754,24 | 6,80 ms | 15,00 ms | -8,3% |
| 6 | Yup | 5.974,26 | 16,35 ms | 31,00 ms | -60,2% |

#### Comparativo Bun vs Node.js

| Validador | Bun (req/s) | Node (req/s) | Δ Bun vs Node | Bun Lat | Node Lat | Bun P99 | Node P99 |
|-----------|-------------|-------------|---------------|---------|----------|---------|----------|
| **AJV** | 22.527,44 | 14.998,08 | **+50,2%** | 3,93 ms | 6,16 ms | 8,60 ms | 14,20 ms |
| **Typia** | 22.450,64 | 14.755,28 | **+52,1%** | 3,90 ms | 6,26 ms | 8,40 ms | 14,80 ms |
| **Schema-Shield** | 21.106,48 | 14.500,80 | **+45,5%** | 4,23 ms | 6,40 ms | 8,60 ms | 14,20 ms |
| **Zod** | 20.379,76 | 13.754,24 | **+48,2%** | 4,42 ms | 6,80 ms | 9,40 ms | 15,00 ms |
| **Yup** | 6.192,00 | 5.974,26 | **+3,6%** | 15,76 ms | 16,35 ms | 22,60 ms | 31,00 ms |

#### Observações

- **AJV** manteve a liderança em ambos os runtimes, confirmando a maturidade do compilador de schemas.
- **Typia** ficou em segundo lugar no Node, com diferença marginal de apenas -1,6% em relação ao AJV — impressionante por não utilizar o schema compiler do Fastify e operar via transformação estática em tempo de compilação.
- **Valibot** surpreendeu ao superar o Zod no Node, entregando throughput ~2,6% maior, mesmo sendo uma biblioteca mais recente e com abordagem semelhante de parsing dinâmico sem compilação prévia.
- **Schema-Shield** ficou em terceiro lugar, com latência P99 idêntica ao AJV (14,20 ms), demonstrando boa consistência.
- **Zod** apresentou a maior latência P99 entre os validadores estruturais (15,00 ms), confirmando o custo do parsing recursivo do `.safeParse()`.
- **Yup** teve desempenho drasticamente inferior: ~60% abaixo do AJV e latência média 2,5× maior que o último colocado. Sua API de validação síncrona com wrapping de schemas parece não se beneficiar da compilação JIT do V8.

#### Curva de Aquecimento JIT

Assim como observado na Parte I, o Node.js apresentou aquecimento JIT em todos os validadores. O Typia, por exemplo, saltou de **14.348 rps** (rodada 1) para **15.800 rps** (rodada 3) — um ganho de +10,1% conforme o V8 otimizava os hot paths. Este comportamento não foi observado no Bun, que manteve throughput consistente desde a primeira rodada.

---

## Conclusão e Recomendações

### Stack Recomendada

Com base nos dados empíricos consolidados, a stack de maior performance para o subsistema de validação é:

> **Runtime:** Bun (JavaScriptCore)
> **Framework:** Elysia
> **Validador:** TypeBox (validação nativa)
> **Benchmark:** 25.915 req/s | Latência Média 3,45 ms | P99 6,60 ms

O Elysia consagrou-se campeão absoluto dos benchmarks por abdicar de camadas de compatibilidade do Node.js, acoplando-se diretamente ao `Bun.serve()` com pré-compilação estática de esquemas via TypeBox. O Fastify+AJV (segundo lugar) e o Fastify+Typia (terceiro lugar, com diferença marginal de ~0,3%) demonstram que o ecossistema Bun amadureceu a ponto de executar tanto código gerado dinamicamente (`new Function`) quanto código transformado estaticamente (typia) com desempenho superior ao Node.js nativo.

### Bun vs Node.js: Comparativo Geral

A expansão da matriz de testes para o Node.js (V8) revelou três conclusões importantes:

1. **Bun é consistentemente +45-52% mais rápido** que Node.js nos validadores compilados/JIT (AJV, Typia, Schema-Shield, Zod), mas a diferença é **marginal no Yup (+3,6%)**, confirmando que o gargalo do Yup está na arquitetura da biblioteca, não no motor JavaScript.
2. **A ordenação de performance entre validadores se mantém idêntica** em ambos os runtimes: AJV > Typia > Schema-Shield > Zod > Yup, confirmando que as características intrínsecas de cada biblioteca (compilação JIT, transformação estática, parsing interpretativo) são determinantes independentemente do motor JavaScript.
3. **Node.js apresenta curva de aquecimento JIT** em todos os cenários, com ganhos de +10-23% entre a primeira e última rodada, enquanto Bun opera em regime permanente desde o início — fator crítico para ambientes serverless com ciclos de vida curtos.

### Custo da Validação na Arquitetura

Considerando benchmarks de rota vazia (Hello World) onde o Bun atinge ~58.4k req/s, a introdução do esquema complexo reduziu a vazão para ~22.5k req/s (Fastify+AJV). Isso isola com precisão o custo da validação de contratos de dados: **aproximadamente 61% da capacidade de processamento** é consumida pela segurança de tipos em payloads severos — tornando a escolha do runtime e do validador um fator crítico para a saúde financeira e de hardware da infraestrutura.

### Próximos Passos Recomendados

1. **Perfilamento de memória (heap profiling):** monitorar o comportamento de alocação sob estresse contínuo de 60s para mensurar o impacto do GC em cada validador.
2. **Simulação de gargalo misto:** adicionar atraso assíncrono artificial (I/O delay de 20ms) nas rotas para verificar se as diferenças percentuais se mantêm ou se diluem diante de espera de rede.
3. ~~**Expansão da matriz de testes:** incluir validação com `@sinclair/typebox` puro (sem Elysia) e testes com `typia` integrado ao schema compiler do Fastify para avaliar o ganho potencial de performance.~~ ✅ **Concluído** — matriz expandida para Node.js com 6 validadores (AJV, Zod, Yup, Valibot, Schema-Shield e Typia).

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


### Payload Utilizado nos testes :

  ```typescript
const payloadValido = {
  projetoId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  timestamp: 1717872234,
  configuracoes: {
    taxaAmostragem: 48000,
    bitrate: 320,
    formato: "wav",
    efeitosAtivos: ["reverb", "delay", "compressor", "limiter"],
  },
  camadasAnalise: [
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      nomeTrilha: "Vocal Principal - Take 3",
      volume: 0.85,
      delayOffset: -12.5,
      tagsInstrumentos: ["vocal", "lead"],
      metadadosFrequencia: [
        { hz: 60, ganho: -2.5, q: 1.4 },
        { hz: 250, ganho: 1.2, q: 0.7 },
        { hz: 1000, ganho: -0.5, q: 1.0 },
        { hz: 5000, ganho: 3.0, q: 0.5 },
      ],
    },
    {
      id: "789e4567-e89b-12d3-a456-426614174011",
      nomeTrilha: "Guitarra Base L",
      volume: 0.7,
      delayOffset: 4.0,
      tagsInstrumentos: ["guitar", "electric", "rhythm"],
      metadadosFrequencia: [
        { hz: 80, ganho: -12.0, q: 2.0 },
        { hz: 1200, ganho: 2.1, q: 1.2 },
      ],
    },
  ],
  tagsSociais: ["rock", "collaboration", "api-test", "bun-speed"],
};


````


---

**Responsável Técnico:** Braian de Liz da Silva / Pesquisa & Desenvolvimento  
**Data do Relatório:** 11 de junho de 2026
