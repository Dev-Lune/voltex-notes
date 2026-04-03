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
const LOOPBACK_PORT = 8923
const REDIRECT_URI = `http://127.0.0.1:${LOOPBACK_PORT}/callback`

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
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;
height:100vh;background:#0f1117;color:#d4d8e8;flex-direction:column;gap:24px;}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.brand svg{width:28px;height:28px;}
.brand span{font-size:17px;font-weight:600;letter-spacing:0.3px;}
.check{width:52px;height:52px;border-radius:50%;background:rgba(59,142,245,0.12);display:flex;align-items:center;
justify-content:center;animation:scaleIn 0.4s ease-out;}
.check svg{width:26px;height:26px;}
h2{font-size:18px;font-weight:600;letter-spacing:0.2px;}
p{color:#6b7280;font-size:13px;}
@keyframes scaleIn{0%{transform:scale(0.5);opacity:0}100%{transform:scale(1);opacity:1}}
</style></head><body>
<div class="brand">
  <svg viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#3b8ef5" fill-opacity="0.12"/><path d="M8 16l4-8 4 8-4 8z" fill="#3b8ef5"/><path d="M16 16l4-8 4 8-4 8z" fill="#3b8ef5" fill-opacity="0.5"/></svg>
  <span>Voltex Notes</span>
</div>
<div class="check">
  <svg viewBox="0 0 24 24" fill="none" stroke="#3b8ef5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</div>
<h2>Signed in successfully</h2>
<p>You can close this tab and return to the app.</p>
</body></html>`
}

/** HTML page shown on auth error */
function errorHtml(msg: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;
height:100vh;background:#0f1117;color:#d4d8e8;flex-direction:column;gap:24px;}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.brand svg{width:28px;height:28px;}
.brand span{font-size:17px;font-weight:600;letter-spacing:0.3px;}
.icon{width:52px;height:52px;border-radius:50%;background:rgba(239,68,68,0.12);display:flex;align-items:center;
justify-content:center;animation:scaleIn 0.4s ease-out;}
.icon svg{width:26px;height:26px;}
h2{font-size:18px;font-weight:600;color:#ef4444;letter-spacing:0.2px;}
p{color:#6b7280;font-size:13px;}
@keyframes scaleIn{0%{transform:scale(0.5);opacity:0}100%{transform:scale(1);opacity:1}}
</style></head><body>
<div class="brand">
  <svg viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#3b8ef5" fill-opacity="0.12"/><path d="M8 16l4-8 4 8-4 8z" fill="#3b8ef5"/><path d="M16 16l4-8 4 8-4 8z" fill="#3b8ef5" fill-opacity="0.5"/></svg>
  <span>Voltex Notes</span>
</div>
<div class="icon">
  <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</div>
<h2>Sign-in failed</h2>
<p>${msg.replace(/</g, '&lt;')}</p>
<p>Close this tab and try again.</p>
</body></html>`
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

          const redirectUri = REDIRECT_URI

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

        // Listen on fixed port on loopback
        server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
          const redirectUri = REDIRECT_URI

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
