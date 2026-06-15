import { describe, test, expect, beforeAll, afterAll } from "vitest";
import autocannon from "autocannon";
import Fastify from "fastify";
import typia, { tags } from "typia";

interface IConfiguracoes {
  taxaAmostragem: 44100 | 48000 | 96000;
  bitrate: number & tags.Minimum<128> & tags.Maximum<320>;
  formato: string & tags.Pattern<"^(mp3|wav|flac|ogg)$">;
  efeitosAtivos: Array<string & tags.MinLength<1>> & tags.MinItems<1> & tags.MaxItems<10>;
}

interface IMetadadosFrequencia {
  hz: number;
  ganho: number;
  q: number;
}

interface ICamadaAnalise {
  id: string & tags.Format<"uuid">;
  nomeTrilha: string & tags.MinLength<3> & tags.MaxLength<50>;
  volume: number & tags.Minimum<0> & tags.Maximum<1>;
  delayOffset: number & tags.Minimum<-500> & tags.Maximum<500>;
  tagsInstrumentos: Array<string> & tags.MaxItems<5>;
  metadadosFrequencia: Array<IMetadadosFrequencia> & tags.MaxItems<20>;
}

interface IAudioPayload {
  projetoId: string & tags.Format<"uuid">;
  timestamp: number & tags.Minimum<0>;
  configuracoes: IConfiguracoes;
  camadasAnalise: Array<ICamadaAnalise> & tags.MinItems<1> & tags.MaxItems<15>;
  tagsSociais: Array<string> & tags.MaxItems<50>;
}

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
  app.post("/StronValid", async (req: any, reply: any) => {
    typia.assert<IAudioPayload>(req.body);
    return reply.send("hellor word");
  });
  await app.listen({ port: 0 });
  port = app.server.address().port;
});

afterAll(async () => {
  await app.close();
});

describe("Benchmark Node Typia - Validação /StronValid", () => {
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
      console.log("  [Node Typia] Resultados do benchmark");
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
    60000,
  );
});
