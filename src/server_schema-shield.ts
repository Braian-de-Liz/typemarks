import fastify, {type  RouteShorthandOptions }  from "fastify";
import { SchemaShield, ValidationError } from "schema-shield";

const Fastify = fastify();

const shield = new SchemaShield({ failFast: true });

Fastify.setValidatorCompiler(({ schema, httpPart }) => {
    const validation = shield.compile(schema);

    return (data) => {
        const result = validation(data);

        if (result.valid) {
            return { value: result.data };
        } else {
            const mensagem = result.error instanceof ValidationError ? `Erro de validação: ${result.error.message}` : `Falha de validação no campo: ${httpPart}`;

            const error = new Error(mensagem);

            (error as any).statusCode = 400;
            (error as any).validationContext = httpPart;

            return { error };
        }
    };
});

const schema: RouteShorthandOptions = {
    schema: {
        body: {
            type: "object",
            properties: {
                projetoId: {
                    type: "string",
                    format: "uuid",
                },
                timestamp: {
                    type: "integer",
                    minimum: 0,
                },
                configuracoes: {
                    type: "object",
                    properties: {
                        taxaAmostragem: {
                            type: "integer",
                            enum: [44100, 48000, 96000],
                        },
                        bitrate: {
                            type: "integer",
                            minimum: 128,
                            maximum: 320,
                        },
                        formato: {
                            type: "string",
                            pattern: "^(mp3|wav|flac|ogg)$",
                        },
                        efeitosAtivos: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 1,
                            maxItems: 10,
                        },
                    },
                    required: ["taxaAmostragem", "bitrate", "formato", "efeitosAtivos"],
                    additionalProperties: false,
                },
                camadasAnalise: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string", format: "uuid" },
                            nomeTrilha: {
                                type: "string",
                                minLength: 3,
                                maxLength: 50,
                            },
                            volume: { type: "number", minimum: 0, maximum: 1 },
                            delayOffset: { type: "number", minimum: -500, maximum: 500 },
                            tagsInstrumentos: {
                                type: "array",
                                items: { type: "string" },
                                maxItems: 5,
                            },
                            metadadosFrequencia: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        hz: { type: "number" },
                                        ganho: { type: "number" },
                                        q: { type: "number" },
                                    },
                                    required: ["hz", "ganho", "q"],
                                    additionalProperties: false,
                                },
                                maxItems: 20,
                            },
                        },
                        required: [
                            "id",
                            "nomeTrilha",
                            "volume",
                            "delayOffset",
                            "tagsInstrumentos",
                            "metadadosFrequencia",
                        ],
                        additionalProperties: false,
                    },
                    minItems: 1,
                    maxItems: 15,
                },
                tagsSociais: {
                    type: "array",
                    items: { type: "string" },
                    maxItems: 50,
                },
            },
            required: ["projetoId", "timestamp", "configuracoes", "camadasAnalise", "tagsSociais"],
            additionalProperties: false,
        },
    },
};

Fastify.post("/StronValid", schema, async (request, reply) => {
    return reply.send("hellor word");
});

Fastify.listen({ port: 3333 }, () => { console.log("server running") });