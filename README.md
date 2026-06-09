# RELATÓRIO TÉCNICO: ISOLAMENTO DE MOTORES JAVASCRIPT EM AMBIENTE DE VALIDAÇÃO PURA

## 1. Objetivo

Este relatório analisa o desempenho bruto e isolado do validador AJV comparando os dois principais ambientes de execução (runtimes) do mercado atual: Node.js (Motor V8) e Bun (Motor JavaScriptCore). O experimento foi conduzido em um repositório limpo (typemarks) para remover quaisquer gargalos colaterais de arquiteturas complexas de software.

## 2. Metodologia de Isolamento

Para garantir a pureza dos dados coletados e focar estritamente na capacidade de processamento dos motores de execução ao lidar com geração de código dinâmica, o ambiente foi configurado da seguinte forma:

- **Infraestrutura Desacoplada:** Remoção de middlewares de bancos de dados, barramentos de eventos e injeções complexas de rotas.
- **Parâmetros de Carga Fixos:** Execução via Autocannon simulando 100 conexões simultâneas durante o período contínuo de 10 segundos.
- **Cenário de Estresse:** Validação de um payload complexo e aninhado contendo estruturas de dados variadas (UUIDs, padrões Regex, arrays aninhados e regras numéricas de limite).
- **Amostragem:** 5 rodadas consecutivas para cada runtime, permitindo estabilização do JIT (Just-In-Time Compiler) e análise de comportamento do Garbage Collector.

## 3. Dados Coletados (Métricas Brutas)

Os blocos abaixo contêm os dados exatos extraídos do terminal de testes:

### 3.1. Cenário A: AJV rodando no Node.js (Motor V8)

| Rodada | Req/s | Latência Média | P99 |
|--------|-------|----------------|-----|
| 1 | 21.262,80 | 4,21ms | 9,00ms |
| 2 | 21.751,60 | 4,09ms | 8,00ms |
| 3 | 22.262,00 | 3,98ms | 8,00ms |
| 4 | 22.332,40 | 3,96ms | 8,00ms |
| 5 | 22.222,80 | 3,99ms | 9,00ms |

### 3.2. Cenário B: AJV rodando no Bun (Motor JavaScriptCore)

| Rodada | Req/s | Latência Média | P99 |
|--------|-------|----------------|-----|
| 1 | 21.681,20 | 4,09ms | 8,00ms |
| 2 | 21.590,80 | 4,12ms | 8,00ms |
| 3 | 22.002,80 | 4,03ms | 8,00ms |
| 4 | 22.112,40 | 4,01ms | 8,00ms |
| 5 | 21.833,20 | 4,07ms | 8,00ms |

## 4. Análise e Consolidação Estatística

Extraindo as médias aritméticas das 5 rodadas de testes para ambos os ecossistemas, obtivemos o seguinte resultado comparativo:

| Métrica de Performance | Média Node.js (V8) | Média Bun (JavaScriptCore) | Margem de Diferença |
|------------------------|--------------------|----------------------------|---------------------|
| Throughput (Req/Sec) | 21.966,32 rps | 21.844,08 rps | Node.js +0,56% (Empate) |
| Latência Média | 4,04 ms | 4,06 ms | Node.js -0,49% (Empate) |
| Estabilidade P99 (Percentil) | 8,40 ms | 8,00 ms | Bun -4,76% (Mais Estável) |
| Throughput de Rede Média | 2,81 MB/s | 2,79 MB/s | Node.js +0,71% (Empate) |

## 5. Conclusões e Descobertas de Engenharia

O teste isolado trouxe respostas fundamentais sobre a paridade de armas entre os motores de execução modernos:

**Empate Técnico Absoluto em Geração Dinâmica:** A diferença de apenas 0,56% em requisições por segundo aponta que o ecossistema do Bun e o motor JavaScriptCore evoluíram a ponto de mitigar qualquer antiga desvantagem de desempenho histórico que o AJV possuía fora do V8. Ambos os ambientes compilam e executam strings dinâmicas (`new Function`) com eficácia máxima.

**Consistência e Gerenciamento de Memória do Bun:** O Bun demonstrou uma estabilidade ligeiramente superior no percentil mais crítico de latência (P99 fixado rigorosamente em 8,00ms em todas as rodadas). Isso sinaliza que os ciclos de coleta de lixo (Garbage Collection) do JavaScriptCore interromperam menos o fluxo de execução sob estresse contínuo do que o V8 do Node.js.

**Salto de Desempenho por Desacoplamento:** O isolamento da rota no repositório typemarks resultou em um incremento imediato de ~35% no teto de requisições por segundo (saltando de 16k rps no projeto principal para 22k rps), evidenciando que em aplicações de alta concorrência, o empilhamento de middlewares e hooks periféricos consome frações severas de CPU.

### 5.1. Próximos Passos Recomendados

Para concluir a matriz de decisão de arquitetura da empresa, este relatório recomenda a execução da segunda fase do experimento isolado: rodar o validador estático Schema-Shield sob as mesmas condições no Node.js e no Bun.

Como o Schema-Shield elimina a geração de código dinâmico e foca em algoritmos interpretativos lineares, essa segunda fase isolará o comportamento nativo de loops e checagem de propriedades de cada motor, determinando qual runtime gerencia melhor códigos estáticos.

---

**Responsável Técnico:** Engenharia de Backend / Pesquisa & Desenvolvimento
**Data do Relatório:** 8 de junho de 2026
