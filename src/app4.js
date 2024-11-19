import { createBot, createProvider, createFlow, addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB } from '@builderbot/bot'
import { BaileysProvider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008

const welcomeFlow = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx) => {
        try {
            console.log('Enviando mensaje a webhook:', ctx.body);
            await fetch('https://primary-production-7022.up.railway.app/webhook-test/test-bb1', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: ctx.body,
                    from: ctx.from,
                })
            });
        } catch (error) {
            console.error('Error sending webhook:', error);
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

    // Endpoint modificado para recibir la respuesta de n8n
    adapterProvider.server.post('/v1/messages', 
        handleCtx(async (bot, req, res) => {
            try {
                const { number, message } = req.body
                // Usar sendMessage con un objeto de opciones vacío
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
