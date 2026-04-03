/**
 * Google OAuth via system default browser.
 *
 * Flow:
 *  1. Renderer calls `auth:google-sign-in`
 *  2. We spin up a one-shot HTTP server on a random port
 *  3. Open Google's OAuth consent screen in the default browser
 *  4. Google redirects back to http://127.0.0.1:{port}/callback?code=…
 *  5. We exchange the code for tokens via Google's token endpoint
 *  6. Return the ID token to the renderer
 *  7. Renderer calls `signInWithCredential(GoogleAuthProvider.credential(idToken))`
 */

import { ipcMain, shell } from 'electron'
import http from 'http'
import https from 'https'
import { URL, URLSearchParams } from 'url'
import crypto from 'crypto'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPES = 'openid email profile'

/** Exchange authorization code for tokens using Node https */
function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ id_token: string; access_token: string }> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString()

    const req = https.request(
      GOOGLE_TOKEN_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.error) {
              reject(new Error(json.error_description || json.error))
            } else {
              resolve({ id_token: json.id_token, access_token: json.access_token })
            }
          } catch {
            reject(new Error('Failed to parse token response'))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

/** HTML page shown after successful auth */
function successHtml(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
height:100vh;margin:0;background:#1e1e2e;color:#cdd6f4;flex-direction:column;gap:12px;}
h2{margin:0;font-size:20px;} p{margin:0;color:#a6adc8;font-size:14px;}
.check{width:48px;height:48px;border-radius:50%;background:#a6e3a1;display:flex;align-items:center;
justify-content:center;font-size:24px;color:#1e1e2e;}</style></head><body>
<div class="check">✓</div><h2>Signed in to Voltex Notes</h2>
<p>You can close this tab and return to the app.</p></body></html>`
}

/** HTML page shown on auth error */
function errorHtml(msg: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
height:100vh;margin:0;background:#1e1e2e;color:#cdd6f4;flex-direction:column;gap:12px;}
h2{margin:0;font-size:20px;color:#f38ba8;} p{margin:0;color:#a6adc8;font-size:14px;}</style></head><body>
<h2>Sign-in failed</h2><p>${msg.replace(/</g, '&lt;')}</p>
<p>Close this tab and try again.</p></body></html>`
}

export function registerAuthHandlers(): void {
  ipcMain.handle(
    'auth:google-sign-in',
    async (_event, clientId: string, clientSecret: string) => {
      // PKCE state for CSRF protection
      const state = crypto.randomBytes(16).toString('hex')

      return new Promise<{ idToken: string } | { error: string }>((resolve) => {
        // Spin up a one-shot local HTTP server
        const server = http.createServer((req, res) => {
          if (!req.url?.startsWith('/callback')) {
            res.writeHead(404)
            res.end()
            return
          }

          const url = new URL(req.url, `http://127.0.0.1`)
          const code = url.searchParams.get('code')
          const returnedState = url.searchParams.get('state')
          const error = url.searchParams.get('error')

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(errorHtml(error))
            server.close()
            resolve({ error: `Google auth error: ${error}` })
            return
          }

          if (returnedState !== state) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(errorHtml('State mismatch — possible CSRF'))
            server.close()
            resolve({ error: 'State mismatch' })
            return
          }

          if (!code) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(errorHtml('No authorization code received'))
            server.close()
            resolve({ error: 'No authorization code' })
            return
          }

          const redirectUri = `http://127.0.0.1:${(server.address() as { port: number }).port}/callback`

          exchangeCode(code, clientId, clientSecret, redirectUri)
            .then(({ id_token }) => {
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(successHtml())
              server.close()
              resolve({ idToken: id_token })
            })
            .catch((err) => {
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(errorHtml(String(err)))
              server.close()
              resolve({ error: String(err) })
            })
        })

        // Listen on random port on loopback
        server.listen(0, '127.0.0.1', () => {
          const port = (server.address() as { port: number }).port
          const redirectUri = `http://127.0.0.1:${port}/callback`

          const authUrl =
            `${GOOGLE_AUTH_URL}?` +
            new URLSearchParams({
              client_id: clientId,
              redirect_uri: redirectUri,
              response_type: 'code',
              scope: SCOPES,
              state,
              access_type: 'offline',
              prompt: 'select_account',
            }).toString()

          shell.openExternal(authUrl)
        })

        // Timeout after 5 minutes — user may have abandoned
        setTimeout(() => {
          server.close()
          resolve({ error: 'Sign-in timed out' })
        }, 5 * 60 * 1000)
      })
    }
  )
}
