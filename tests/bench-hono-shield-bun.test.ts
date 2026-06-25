import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import autocannon from "autocannon";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { SchemaShield, ValidationError } from "schema-shield";

const schemaBody = {
  type: "object",
  required: ["projetoId", "timestamp", "configuracoes", "camadasAnalise", "tagsSociais"],
  additionalProperties: false,
  properties: {
    projetoId: { type: "string", format: "uuid" },
    timestamp: { type: "integer", minimum: 0 },
    configuracoes: {
      type: "object",
      required: ["taxaAmostragem", "bitrate", "formato", "efeitosAtivos"],
      additionalProperties: false,
      properties: {
        taxaAmostragem: { type: "integer", enum: [44100, 48000, 96000] },
        bitrate: { type: "integer", minimum: 128, maximum: 320 },
        formato: { type: "string", pattern: "^(mp3|wav|flac|ogg)$" },
        efeitosAtivos: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 10 },
      },
    },
    camadasAnalise: {
      type: "array",
      minItems: 1,
      maxItems: 15,
      items: {
        type: "object",
        required: ["id", "nomeTrilha", "volume", "delayOffset", "tagsInstrumentos", "metadadosFrequencia"],
        additionalProperties: false,
        properties: {
          id: { type: "string", format: "uuid" },
          nomeTrilha: { type: "string", minLength: 3, maxLength: 50 },
          volume: { type: "number", minimum: 0, maximum: 1 },
          delayOffset: { type: "number", minimum: -500, maximum: 500 },
          tagsInstrumentos: { type: "array", items: { type: "string" }, maxItems: 5 },
          metadadosFrequencia: {
            type: "array",
            maxItems: 20,
            items: {
              type: "object",
              required: ["hz", "ganho", "q"],
              additionalProperties: false,
              properties: {
                hz: { type: "number" },
                ganho: { type: "number" },
                q: { type: "number" },
              },
            },
          },
        },
      },
    },
    tagsSociais: { type: "array", items: { type: "string" }, maxItems: 50 },
  },
};

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

const shield = new SchemaShield({ failFast: true });
const validate = shield.compile(schemaBody);

const app = new Hono();
app.post(
  "/StronValid",
  validator("json", (data, c) => {
    const result = validate(data);
    if (result.valid) {
      return result.data;
    }
    const mensagem =
      result.error instanceof ValidationError
        ? `Erro de validação: ${result.error.message}`
        : "Falha de validação";
    return c.json({ success: false, error: mensagem }, 400);
  }),
  (c) => c.text("hellor word"),
);

let server: any;
let port: number;

beforeAll(async () => {
  server = Bun.serve({ fetch: app.fetch, port: 0 });
  port = server.port;
});

afterAll(async () => {
  server.stop();
});

describe("Benchmark Hono + Schema-Shield (Bun) - Validação /StronValid", () => {
  test(
    "POST /StronValid | 100 conexões, 10s",
    async () => {
      const resultado = await autocannon({
        url: `http://localhost:${port}/StronValid`,
        connections: 100,
        duration: 10,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payloadValido),
      });

      expect(resultado.non2xx).toBe(0);
      expect(resultado.errors).toBe(0);
      expect(resultado.timeouts).toBe(0);

      console.log("-".repeat(50));
      console.log("  [Hono + Schema-Shield / Bun] Resultados do benchmark");
      console.log("-".repeat(50));
      console.log(`  Requisições/Sec:    ${resultado.requests.average.toFixed(2)}`);
      console.log(`  Latência Média:     ${resultado.latency.average.toFixed(2)}ms`);
      console.log(`  Latência máx:       ${resultado.latency.max.toFixed(2)}ms`);
      console.log(`  Latência P99:       ${(resultado.latency.p99 || 0).toFixed(2)}ms`);
      console.log(`  Throughput (bytes): ${resultado.throughput.average.toFixed(2)}`);
      console.log(`  Erros:              ${resultado.errors}`);
      console.log(`  Timeouts:           ${resultado.timeouts}`);
      console.log("-".repeat(50));
    },
    30000,
  );
});
