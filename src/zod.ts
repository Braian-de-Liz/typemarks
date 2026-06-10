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
                z.object({ hz: z.number(), ganho: z.number(), q: z.number() })
            ).max(20),
        })
    ).min(1).max(15),
    tagsSociais: z.array(z.string()).max(50),
});

const app = Fastify();

app.setValidatorCompiler(() => {
    return (data) => {
        const result = bodySchema.safeParse(data);
        if (result.success) {
            return { value: result.data };
        }
        return { error: new Error(result.error.message) };
    };
});

app.post("/StronValid", {
    schema: { body: { type: "object" } },
}, async (request, reply) => {
    return reply.send("hellor word");
});

app.listen({ port: 3333 }, () => {
    console.log("Zod server running on port 3333");
});
