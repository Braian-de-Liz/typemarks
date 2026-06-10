import { Elysia, t } from 'elysia';

const schemaAudio = {
    body: t.Object({
        projetoId: t.String({ format: 'uuid' }),
        timestamp: t.Integer({ minimum: 0 }),

        configuracoes: t.Object({
            taxaAmostragem: t.Union([
                t.Literal(44100),
                t.Literal(48000),
                t.Literal(96000)
            ]),
            bitrate: t.Integer({ minimum: 128, maximum: 320 }),
            formato: t.String({ pattern: '^(mp3|wav|flac|ogg)$' }),
            efeitosAtivos: t.Array(t.String(), { minItems: 1, maxItems: 10 })
        }, { additionalProperties: false }),

        camadasAnalise: t.Array(
            t.Object({
                id: t.String({ format: 'uuid' }),
                nomeTrilha: t.String({ minLength: 3, maxLength: 50 }),
                volume: t.Number({ minimum: 0, maximum: 1 }),
                delayOffset: t.Number({ minimum: -500, maximum: 500 }),
                tagsInstrumentos: t.Array(t.String(), { maxItems: 5 }),
                metadadosFrequencia: t.Array(
                    t.Object({
                        hz: t.Number(),
                        ganho: t.Number(),
                        q: t.Number()
                    }, { additionalProperties: false }),
                    { maxItems: 20 }
                )
            }, { additionalProperties: false }),
            { minItems: 1, maxItems: 15 }
        ),

        tagsSociais: t.Array(t.String(), { maxItems: 50 })
    }, { additionalProperties: false })
};

const app = new Elysia()
    .post('/StronValid', ({ body }) => {
        return "hellor word";
    }, schemaAudio)
    .listen(3333, () => {
        console.log("🦊 Elysia server running at http://localhost:3333");
    });