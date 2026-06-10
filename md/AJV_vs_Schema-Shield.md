# RELATÓRIO DE ENGENHARIA: ANÁLISE DE PERFORMANCE E ARQUITETURA DO SUBSISTEMA DE VALIDAÇÃO

## 1. Objetivo

Este relatório documenta os testes de carga e estresse realizados no subsistema de validação da API AMOTIF. O objetivo principal foi avaliar o impacto real de desempenho ao alternar o motor de validação do Fastify 5 entre o AJV (padrão baseado em compilação dinâmica) e o Schema-Shield (abordagem interpretativa estática), rodando no ambiente de execução Bun (v1.3.14).

## 2. Contexto Tecnológico e Problemática

Historicamente, o AJV utiliza geração de código em tempo de execução (`new Function`) para compilar esquemas do JSON Schema em funções JavaScript puras. No ecossistema Node.js (motor V8), essa abordagem garante uma performance extrema através de otimizações JIT (Just-In-Time).

Contudo, ao migrar para o Bun, que utiliza o motor JavaScriptCore (JSC), havia a hipótese de que a geração dinâmica de código causaria desotimizações severas no JSC. Como alternativa para o ecossistema da AMOTIF, levantou-se o uso do schema-shield, que realiza validações estruturais puras e lineares, teoricamente mais amigáveis ao JSC.

## 3. Metodologia do Teste

Para isolar a capacidade de processamento de CPU e I/O dos validadores, eliminando gargalos externos como consultas ao banco de dados NeonDB, foi criada uma rota de estresse dedicada (`/api/StronValid`).

### 3.1. O Payload de Teste

O teste utilizou um objeto de telemetria musical complexo e aninhado, simulando dados reais de análise de frequências e camadas da AMOTIF:

- Tipos validados: UUIDs (formatos estritos), Inteiros com limites (minimum/maximum), Strings com expressões regulares (Regex de formatos de áudio), Arrays dinâmicos e Objetos aninhados com até 20 sub-itens.

### 3.2. Ferramenta e Parâmetros de Carga

Os benchmarks foram executados nativamente via `bun test` utilizando a biblioteca Autocannon com os seguintes parâmetros estáveis:

- **Duração de cada rodada:** 10 segundos
- **Conexões simultâneas:** 100 conexões
- **Método HTTP:** POST com payload JSON completo
- **Autenticação:** Hook global de JWT (onRequest) ativo e validando assinaturas.
- **Amostragem:** 5 rodadas consecutivas para cada validador (com intervalo de respiro para limpeza de memória/Garbage Collection).

## 4. Resultados Coletados (Dados Brutos)

Abaixo estão os dados consolidados extraídos diretamente do console de testes do Bun:

### 4.1. Cenário A: Com Schema-Shield (Validação Estática)

| Rodada | Requisições/s | Latência Média | Latência P99 |
|--------|---------------|----------------|--------------|
| #1 | 14.877,60 | 6,20 ms | 12,00 ms |
| #2 | 15.087,20 | 6,10 ms | 11,00 ms |
| #3 | 15.122,40 | 6,09 ms | 12,00 ms |
| #4 | 15.009,60 | 6,13 ms | 11,00 ms |
| #5 | 15.028,80 | 6,13 ms | 11,00 ms |
| **Média** | **~15.025,12** | **6,13 ms** | **11,40 ms** |

### 4.2. Cenário B: Com AJV (Compilação Padrão do Fastify)

| Rodada | Requisições/s | Latência Média | Latência P99 |
|--------|---------------|----------------|--------------|
| #1 | 16.557,20 | 5,58 ms | 11,00 ms |
| #2 | 16.468,80 | 5,61 ms | 11,00 ms |
| #3 | 16.604,80 | 5,58 ms | 10,00 ms |
| #4 | 16.590,41 | 5,56 ms | 10,00 ms |
| #5 | 16.472,00 | 5,62 ms | 11,00 ms |
| **Média** | **~16.538,68** | **5,59 ms** | **10,40 ms** |

## 5. Análise Comparativa e Consolidação

Ao extrairmos as médias aritméticas das 5 rodadas de cada cenário, obtivemos o seguinte panorama:

| Métrica Analisada | Motor Schema-Shield | Motor AJV | Vencedor Percentual |
|-------------------|---------------------|-----------|---------------------|
| Requisições por Segundo (Média) | 15.025,12 rps | 16.538,68 rps | AJV (+10,07%) |
| Latência Média Global | 6,13 ms | 5,59 ms | AJV (-8,81% mais rápido) |
| Latência no Percentil 99 (P99) | 11,40 ms | 10,40 ms | AJV (Mais estável) |
| Throughput de Rede Médio | 2,48 MB/s | 2,73 MB/s | AJV (+10,08%) |
| Taxa de Erros / Timeouts | 0 / 0 | 0 / 0 | Empate Técnico (100% Sucesso) |

## 6. Parecer Técnico e Conclusões

Contrapondo a hipótese inicial da engenharia, o **AJV superou o Schema-Shield por uma margem constante de ~10%** em todas as métricas chaves de desempenho.

Essa vitória do AJV dentro do ambiente Bun (v1.3.14) é explicada por dois fatores arquiteturais:

1. **Diluição do Custo de Inicialização (Cold Start):** O AJV sofre uma penalidade de CPU nos primeiros milissegundos para compilar o esquema via `new Function`. Como o teste de carga durou 10 segundos ininterruptos, esse custo inicial tornou-se estatisticamente irrelevante. Uma vez compilado, o código gerado em formato flat (plano) executa em velocidade máxima de hardware.

2. **Maturidade do JIT do Bun:** O motor JavaScriptCore evoluiu drasticamente nas versões recentes do Bun, demonstrando excelente capacidade de otimizar o código gerado dinamicamente pelo AJV.

### 6.1. Recomendação Arquitetural para a AMOTIF

Com base nos dados empíricos coletados, a recomendação varia de acordo com o ambiente de implantação final do microsserviço:

- **Decisão adotada para Servidor Dedicado / Container (Longo Prazo):** Manter o AJV (removendo o registro do plugin customizado). Como a API AMOTIF operará de forma contínua em ambiente de produção permanente, o ganho de 10% em Throughput escalará melhor sob alta concorrência.

- **Exceção para Arquiteturas Edge / Serverless:** Caso módulos específicos da API sejam migrados no futuro para ambientes de curtíssimo ciclo de vida (como Cloudflare Workers), o Schema-Shield deverá ser reativado exclusivamente nesses módulos para mitigar o impacto de cold starts repetitivos.

---

**Responsável Técnico:** Braian de Liz da Silva
**Data do Relatório:** 9 de junho de 2026
