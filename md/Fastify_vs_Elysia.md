# Relatório de Benchmark: Elysia vs. Fastify no Bun Runtime

## 1. Objetivo

O objetivo deste documento é registar e analisar comparativamente o desempenho dos frameworks Elysia (nativo do Bun) e Fastify (com validação Ajv), ambos executados sobre o runtime Bun, sob um cenário de stress contínuo com payloads complexos.

## 2. Ambiente de Execução e Parâmetros do Teste

- **Runtime:** Bun v1.3.14 
- **Ferramenta de Teste:** bun test (executando suite de benchmark customizada em `tests/bench.test.ts`)
- **Cenário de Carga:** Rota `POST /StronValid`
- **Concorrência:** 100 conexões simultâneas
- **Duração de cada Janela:** 10 segundos por rodada
- **Amostragem:** 5 rodadas consecutivas para cada framework (sem reinício do processo)

## 3. Dados Brutos Recolhidos

### 3.1. Amostragem Elysia (Nativo)

| Rodada | Requisições / Seg (RPS) | Latência Média | Latência Máx | Latência P99 | Throughput (Bytes) |
|--------|------------------------|----------------|--------------|--------------|-------------------|
| #1 | 23 441.60 | 3.73 ms | 58.00 ms | 8.00 ms | 3 000 524.80 |
| #2 | 22 640.00 | 3.90 ms | 54.00 ms | 9.00 ms | 2 897 920.00 |
| #3 | 22 291.20 | 3.97 ms | 57.00 ms | 8.00 ms | 2 853 273.60 |
| #4 | 22 180.80 | 4.00 ms | 56.00 ms | 9.00 ms | 2 839 142.40 |
| #5 | 21 904.00 | 4.05 ms | 53.00 ms | 9.00 ms | 2 803 712.00 |
| **Média** | **~22 491.52** | **3.93 ms** | **55.60 ms** | **8.60 ms** | **2 878 914.56** |

### 3.2. Amostragem Fastify (via Camada de Compatibilidade)

| Rodada | Requisições / Seg (RPS) | Latência Média | Latência Máx | Latência P99 | Throughput (Bytes) |
|--------|------------------------|----------------|--------------|--------------|-------------------|
| #1 | 22 550.40 | 3.90 ms | 57.00 ms | 9.00 ms | 2 886 451.20 |
| #2 | 22 122.80 | 4.01 ms | 56.00 ms | 9.00 ms | 2 831 718.40 |
| #3 | 22 323.60 | 3.97 ms | 55.00 ms | 8.00 ms | 2 857 420.80 |
| #4 | 22 378.80 | 3.95 ms | 54.00 ms | 9.00 ms | 2 864 486.40 |
| #5 | 22 700.80 | 3.89 ms | 49.00 ms | 8.00 ms | 2 905 702.40 |
| **Média** | **~22 415.28** | **3.94 ms** | **54.20 ms** | **8.60 ms** | **2 869 155.84** |

## 4. Análise Técnica dos Resultados

### 4.1. Empate Técnico Absoluto

A variação entre a média de vazão (throughput) do Elysia (~22.491 RPS) e do Fastify (~22.415 RPS) foi de apenas **0,34%**. No âmbito da engenharia de software, uma diferença desta magnitude enquadra-se na margem de oscilação do sistema operativo ou de flutuação térmica do processador. As métricas de latência P99 (8-9ms) e latência média (~3.9ms) foram idênticas em ambos os cenários.

### 4.2. Unificação da Infraestrutura de Rede (Bun.serve)

O fator determinante para a igualdade de desempenho foi a execução de ambos os frameworks em cima do runtime Bun. O Fastify é construído sobre o módulo nativo `http` do Node.js. Contudo, ao ser executado pelo Bun, ocorre uma substituição automática a baixo nível: o módulo `http` é mapeado diretamente para a arquitetura em C++ do `Bun.serve()`.

Como consequência, a eficiência no processamento de sockets TCP, parsing de cabeçalhos HTTP e transporte de rede foi exatamente a mesma para ambos os concorrentes.

### 4.3. Deslocamento do Gargalo para a CPU (CPU-Bound Validation)

O payload submetido (`schemaAudio`) possui um nível elevado de aninhamento e regras estritas de validação (formatos UUID, limites numéricos, regex). Em rotas simples ("Hello World"), o gargalo reside no parsing de rede, onde frameworks nativos tendem a destacar-se.

Neste cenário de validação complexa, o gargalo deslocou-se inteiramente para o processamento lógico da CPU. Tanto o Ajv (utilizado pelo Fastify) quanto o TypeBox (utilizado pelo Elysia) compilam os esquemas JSON em funções JavaScript nativas altamente otimizadas. Executadas pela mesma engine (JavaScriptCore do Bun), as duas soluções de validação alcançaram a mesma eficiência de computação bruta.

### 4.4. Comportamento das Curvas de Estabilidade

Embora as médias sejam equivalentes, o comportamento ao longo das cinco rodadas consecutivas revelou abordagens arquiteturais distintas:

**Elysia (Curva de Decaimento):** Iniciou com o pico do benchmark (23 441 RPS) mas apresentou uma perda gradual até à última rodada (21 904 RPS). Este comportamento correlaciona-se com a alocação dinâmica de contextos e padrões de encadeamento modernos baseados em TypeScript, que geram maior volume de objetos temporários em memória, aumentando a frequência de intervenção do Garbage Collector (GC) do Bun sob stress acumulado.

**Fastify (Curva de Estabilização Linear):** Manteve uma consistência linear rigorosa, terminando a última rodada no seu ponto mais alto (22 700 RPS). A arquitetura do Fastify foi desenhada de forma rigorosa para mitigar a alocação de objetos desnecessários e reutilizar contextos (*object pooling*). O compilador JIT (Just-In-Time) do Bun consegue detetar estas funções monomórficas e previsíveis, aplicando otimizações progressivas à medida que o teste avança.

## 5. Conclusão

O benchmark demonstra que a camada de compatibilidade do Bun com o ecossistema Node.js atingiu um estado de maturidade excepcional, eliminando o overhead histórico do Fastify e equiparando-o a um framework nativo de última geração.

Para sistemas de produção que lidam com cargas de trabalho focadas em validação complexa de dados, a escolha entre Elysia e Fastify (quando rodando no Bun) não deve ser baseada em performance bruta de rede, mas sim em critérios como:

- **Elysia:** Ideal para projetos Greenfield que priorizam uma experiência de desenvolvimento unificada com TypeScript (end-to-end types) e ecossistema nativo do Bun.
- **Fastify:** Ideal para sistemas corporativos que exigem previsibilidade e estabilidade linear de throughput sob estresse contínuo, além de se beneficiarem de um ecossistema de plugins maduro.
