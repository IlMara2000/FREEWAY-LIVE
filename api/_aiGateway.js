import { createGateway, gateway } from '@ai-sdk/gateway'

export const resolveGatewayProvider = (env = process.env) => {
  if (env.AI_GATEWAY_API_KEY) {
    return createGateway({ apiKey: env.AI_GATEWAY_API_KEY })
  }

  // Il singleton ufficiale recupera il token OIDC temporaneo dal contesto
  // della richiesta Vercel. Passarlo come apiKey disattiverebbe quel flusso.
  if (env.VERCEL || env.VERCEL_ENV || env.VERCEL_OIDC_TOKEN) {
    return gateway
  }

  return null
}
