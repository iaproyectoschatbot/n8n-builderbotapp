import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB } from '@builderbot/bot'
import { BaileysProvider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008

// Define los webhooks de n8n
const N8N_WEBHOOKS = [
    'https://primary-production-7022.up.railway.app/webhook-test/test-bb1',
    'https://primary-production-7022.up.railway.app/webhook/test-bb1',
    'https://primary-production-7022.up.railway.app/webhook-test/test-bb2',
    'https://primary-production-7022.up.railway.app/webhook/test-bb2'
    // Agrega más webhooks según necesites
]

const welcomeFlow = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx) => {
        try {
            console.log('Enviando mensaje a webhooks:', ctx.body);
            
            // Crear array de promesas para cada webhook
            const webhookPromises = N8N_WEBHOOKS.map(webhook => 
                fetch(webhook, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: ctx.body,
                        from: ctx.from,
                    })
                }).catch(error => {
                    console.error(`Error enviando a ${webhook}:`, error);
                    return null; // Continuar con otros webhooks si uno falla
                })
            );

            // Enviar a todos los webhooks simultáneamente
            await Promise.all(webhookPromises);
            
        } catch (error) {
            console.error('Error general:', error);
        }
    })

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow])
    const adapterProvider = createProvider(BaileysProvider, {
        writeMyself: 'both'
    })
    const adapterDB = new MemoryDB()

    const { handleCtx, httpServer } = await createBot({      
        flow: adapterFlow,       
        provider: adapterProvider,
        database: adapterDB,
    })

    // Endpoint para recibir respuestas de n8n
    adapterProvider.server.post('/v1/messages', 
        handleCtx(async (bot, req, res) => {
            try {
                const { number, message } = req.body
                await new Promise(resolve => setTimeout(resolve, 2000)); // Delay de 2 segundos
                await bot.sendMessage(number, message, {})
                return res.end('sent')
            } catch (error) {
                console.error('Error sending message:', error);
                return res.end(JSON.stringify({ error: error.message }))
            }
        })
    )

    httpServer(+PORT)
}

main()
