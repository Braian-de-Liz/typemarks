import { describe, test, expect, beforeAll, afterAll } from "vitest";
import autocannon from "autocannon";
import Fastify from "fastify";
import { z } from "zod";

const bodySchema = z.object({
  projetoId: z.uuid(),
  timestamp: z.number().int().min(0),
  configuracoes: z.object({
    taxaAmostragem: z.union([z.literal(44100), z.literal(48000), z.literal(96000)]),
    bitrate: z.number().int().min(128).max(320),
    formato: z.string().regex(/^(mp3|wav|flac|ogg)$/),
    efeitosAtivos: z.array(z.string()).min(1).max(10),
  }),
  camadasAnalise: z.array(
    z.object({
      id: z.string().uuid(),
      nomeTrilha: z.string().min(3).max(50),
      volume: z.number().min(0).max(1),
      delayOffset: z.number().min(-500).max(500),
      tagsInstrumentos: z.array(z.string()).max(5),
      metadadosFrequencia: z.array(
        z.object({ hz: z.number(), ganho: z.number(), q: z.number() }),
      ).max(20),
    }),
  ).min(1).max(15),
  tagsSociais: z.array(z.string()).max(50),
});

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

let app: any;
let port: number;

beforeAll(async () => {
  app = Fastify();
  app.setValidatorCompiler((): { (data: any): { value?: any; error?: Error } } => {
    return (data: any) => {
      const result = bodySchema.safeParse(data);
      if (result.success) {
        return { value: result.data };
      }
      return { error: new Error(result.error.message) };
    };
  });
  app.post("/StronValid", { schema: { body: { type: "object" } } }, async (_req: any, reply: any) => {
    return reply.send("hellor word");
  });
  await app.listen({ port: 0 });
  port = app.server.address().port;
});

afterAll(async () => {
  await app.close();
});

describe("Benchmark Node Zod - Validação /StronValid", () => {
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
      console.log("  [Node Zod] Resultados do benchmark");
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
