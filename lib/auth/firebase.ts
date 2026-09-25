import 'server-only'

// Public web API key of the original Booktor Firebase project (sistema-de-login-blog).
// It identifies the project and was already public in the legacy HTML; accounts created
// on the old site keep working because authentication still goes through this project.
const FIREBASE_WEB_API_KEY = 'AIzaSyBauGgt1pm-sBas75N40ufWRsGD6c4BsgM'
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1/accounts'

type FirebaseSession = {
  localId: string
  email: string
  displayName?: string
  idToken: string
}

export class FirebaseAuthError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

async function callIdentityToolkit<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${IDENTITY_TOOLKIT_URL}:${endpoint}?key=${FIREBASE_WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
  if (!response.ok) {
    const code = json?.error?.message?.split(' : ')[0]?.trim() ?? 'UNKNOWN'
    throw new FirebaseAuthError(code)
  }
  return json as T
}

export const firebaseAuth = {
  signIn(email: string, password: string) {
    return callIdentityToolkit<FirebaseSession>('signInWithPassword', { email, password, returnSecureToken: true })
  },
  signUp(email: string, password: string) {
    return callIdentityToolkit<FirebaseSession>('signUp', { email, password, returnSecureToken: true })
  },
  updateDisplayName(idToken: string, displayName: string) {
    return callIdentityToolkit('update', { idToken, displayName, returnSecureToken: false })
  },
  sendPasswordReset(email: string) {
    return callIdentityToolkit('sendOobCode', { requestType: 'PASSWORD_RESET', email })
  },
}

const errorMessages: Record<string, string> = {
  EMAIL_EXISTS: 'Já existe uma conta com este e-mail.',
  INVALID_LOGIN_CREDENTIALS: 'E-mail ou senha incorretos.',
  EMAIL_NOT_FOUND: 'E-mail ou senha incorretos.',
  INVALID_PASSWORD: 'E-mail ou senha incorretos.',
  INVALID_EMAIL: 'Informe um e-mail válido.',
  WEAK_PASSWORD: 'A senha precisa ter pelo menos 6 caracteres.',
  USER_DISABLED: 'Esta conta foi desativada.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  OPERATION_NOT_ALLOWED: 'Este método de acesso não está disponível no momento.',
}

export function describeAuthError(error: unknown) {
  if (error instanceof FirebaseAuthError) {
    return errorMessages[error.code] ?? 'Não foi possível concluir. Tente novamente.'
  }
  return 'Não foi possível conectar ao serviço de autenticação. Tente novamente.'
}
