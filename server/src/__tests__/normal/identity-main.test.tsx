import {
  afterEach, beforeEach, describe, expect, Mock, test,
  vi,
} from 'vitest'
import { Database } from 'better-sqlite3'
import { JSDOM } from 'jsdom'
import app from 'index'
import {
  fetchMock,
  migrate, mock,
  mockedKV,
} from 'tests/mock'
import {
  adapterConfig, localeConfig, routeConfig,
} from 'configs'
import { disableUser } from 'tests/util'
import { AuthCodeBody } from 'configs/type'
import { oauthDto } from 'dtos'
import {
  prepareFollowUpBody, prepareFollowUpParams, getSignInRequest,
  insertUsers, getAuthorizeParams, postSignInRequest, getApp,
  postAuthorizeBody,
} from 'tests/identity'
import { userModel } from 'models'

let db: Database

beforeEach(async () => {
  db = await migrate()
})

afterEach(async () => {
  await db.close()
  await mockedKV.empty()
})

describe(
  'get /authorize-password',
  () => {
    test(
      'should show sign in page',
      async () => {
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByName('email').length).toBe(1)
        expect(document.getElementsByName('password').length).toBe(1)
        expect(document.getElementById('password-row')?.classList).not.toContain('hidden')
        expect(document.getElementById('submit-button')).toBeTruthy()
        expect(document.getElementById('submit-button')?.classList).not.toContain('hidden')
        expect(document.getElementsByTagName('form').length).toBe(1)

        expect(document.getElementsByClassName('g_id_signin').length).toBe(0)
        expect(document.getElementById('facebook-login-btn')).toBeFalsy()
        expect(document.getElementById('github-login-btn')).toBeFalsy()

        const links = document.getElementsByTagName('a')
        expect(links.length).toBe(3)
        expect(links[0].innerHTML).toBe(localeConfig.authorizePassword.signUp.en)
        expect(links[1].innerHTML).toBe(localeConfig.authorizePassword.passwordReset.en)
        expect(links[2].innerHTML).toBe(localeConfig.common.poweredByAuth.en)
      },
    )

    test(
      'should only show email if passkey enroll enabled',
      async () => {
        global.process.env.ALLOW_PASSKEY_ENROLLMENT = true as unknown as string

        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByName('email').length).toBe(1)
        expect(document.getElementsByName('password').length).toBe(1)
        expect(document.getElementById('password-row')?.classList).toContain('hidden')
        expect(document.getElementById('submit-button')).toBeTruthy()
        expect(document.getElementById('submit-button')?.classList).toContain('hidden')
        expect(document.getElementsByTagName('form').length).toBe(1)

        global.process.env.ALLOW_PASSKEY_ENROLLMENT = false as unknown as string
      },
    )

    test(
      'should show google sign in',
      async () => {
        global.process.env.GOOGLE_AUTH_CLIENT_ID = '123'
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByClassName('g_id_signin').length).toBe(1)
        expect(document.getElementById('facebook-login-btn')).toBeFalsy()
        expect(document.getElementById('github-login-btn')).toBeFalsy()

        global.process.env.GOOGLE_AUTH_CLIENT_ID = ''
      },
    )

    test(
      'should show facebook sign in',
      async () => {
        global.process.env.FACEBOOK_AUTH_CLIENT_ID = '123'
        global.process.env.FACEBOOK_AUTH_CLIENT_SECRET = 'abc'
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByClassName('g_id_signin').length).toBe(0)
        expect(document.getElementById('github-login-btn')).toBeFalsy()
        expect(document.getElementById('facebook-login-btn')).toBeTruthy()

        global.process.env.FACEBOOK_AUTH_CLIENT_ID = ''
        global.process.env.FACEBOOK_AUTH_CLIENT_SECRET = ''
      },
    )

    test(
      'should show facebook sign in if secret is empty',
      async () => {
        global.process.env.FACEBOOK_AUTH_CLIENT_ID = '123'
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByClassName('g_id_signin').length).toBe(0)
        expect(document.getElementById('github-login-btn')).toBeFalsy()
        expect(document.getElementById('facebook-login-btn')).toBeFalsy()

        global.process.env.FACEBOOK_AUTH_CLIENT_ID = ''
      },
    )

    test(
      'should show facebook sign in if id is empty',
      async () => {
        global.process.env.FACEBOOK_AUTH_CLIENT_SECRET = 'abc'
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByClassName('g_id_signin').length).toBe(0)
        expect(document.getElementById('github-login-btn')).toBeFalsy()
        expect(document.getElementById('facebook-login-btn')).toBeFalsy()

        global.process.env.FACEBOOK_AUTH_CLIENT_SECRET = ''
      },
    )

    test(
      'should show github sign in',
      async () => {
        global.process.env.GITHUB_AUTH_CLIENT_ID = '123'
        global.process.env.GITHUB_AUTH_CLIENT_SECRET = 'abc'
        global.process.env.GITHUB_AUTH_APP_NAME = 'app'
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByClassName('g_id_signin').length).toBe(0)
        expect(document.getElementById('github-login-btn')).toBeTruthy()
        expect(document.getElementById('facebook-login-btn')).toBeFalsy()

        global.process.env.GITHUB_AUTH_CLIENT_ID = ''
        global.process.env.GITHUB_AUTH_CLIENT_SECRET = ''
        global.process.env.GITHUB_AUTH_APP_NAME = ''
      },
    )

    test(
      'could disable sign up',
      async () => {
        global.process.env.ENABLE_SIGN_UP = false as unknown as string
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        const links = document.getElementsByTagName('a')
        expect(links.length).toBe(2)
        expect(links[0].innerHTML).toBe(localeConfig.authorizePassword.passwordReset.en)
        expect(links[1].innerHTML).toBe(localeConfig.common.poweredByAuth.en)
        global.process.env.ENABLE_SIGN_UP = true as unknown as string
      },
    )

    test(
      'could disable password reset',
      async () => {
        global.process.env.ENABLE_PASSWORD_RESET = false as unknown as string
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        const links = document.getElementsByTagName('a')
        expect(links.length).toBe(2)
        expect(links[0].innerHTML).toBe(localeConfig.authorizePassword.signUp.en)
        expect(links[1].innerHTML).toBe(localeConfig.common.poweredByAuth.en)
        global.process.env.ENABLE_PASSWORD_RESET = true as unknown as string
      },
    )

    test(
      'could disable password sign in',
      async () => {
        global.process.env.ENABLE_PASSWORD_SIGN_IN = false as unknown as string
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByName('email').length).toBe(0)
        expect(document.getElementsByName('password').length).toBe(0)
        expect(document.getElementById('submit-button')).toBeFalsy()
        global.process.env.ENABLE_PASSWORD_SIGN_IN = true as unknown as string
      },
    )

    test(
      'should render locale selector',
      async () => {
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByTagName('select').length).toBe(1)
        const options = document.getElementsByTagName('option')
        expect(options.length).toBe(2)
        expect(options[0].innerHTML).toBe('EN')
        expect(options[1].innerHTML).toBe('FR')
      },
    )

    test(
      'could render french',
      async () => {
        global.process.env.SUPPORTED_LOCALES = ['fr'] as unknown as string
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        const labels = document.getElementsByTagName('label')
        expect(labels[0].innerHTML).toBe(`${localeConfig.authorizePassword.email.fr}<span class="text-red ml-2">*</span>`)
        expect(labels[1].innerHTML).toBe(`${localeConfig.authorizePassword.password.fr}<span class="text-red ml-2">*</span>`)
        global.process.env.SUPPORTED_LOCALES = ['fr'] as unknown as string
      },
    )

    test(
      'could disable locale selector',
      async () => {
        global.process.env.ENABLE_LOCALE_SELECTOR = false as unknown as string
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByTagName('select').length).toBe(0)
        global.process.env.ENABLE_LOCALE_SELECTOR = true as unknown as string
      },
    )

    test(
      'should disable locale selector when there only 1 locale',
      async () => {
        global.process.env.SUPPORTED_LOCALES = ['en'] as unknown as string
        const appRecord = await getApp(db)
        const res = await getSignInRequest(
          db,
          routeConfig.IdentityRoute.AuthorizePassword,
          appRecord,
        )
        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByTagName('select').length).toBe(0)
        global.process.env.SUPPORTED_LOCALES = ['en', 'fr'] as unknown as string
      },
    )
  },
)

describe(
  'post /authorize-password',
  () => {
    test(
      'should get auth code after sign in',
      async () => {
        const appRecord = await getApp(db)
        await insertUsers(db)
        const res = await postSignInRequest(
          db,
          appRecord,
        )
        const json = await res.json()
        expect(json).toStrictEqual({
          code: expect.any(String),
          redirectUri: 'http://localhost:3000/en/dashboard',
          state: '123',
          scopes: ['profile', 'openid', 'offline_access'],
          nextPage: routeConfig.IdentityRoute.AuthorizeMfaEnroll,
        })
        const { code } = json as { code: string }
        const codeStore = JSON.parse(await mockedKV.get(`AC-${code}`) ?? '')
        expect(codeStore.appId).toBe(1)
        expect(codeStore.user.authId).toBe('1-1-1-1')
        expect(codeStore.appName).toBe(appRecord.name)
        expect(codeStore.request.clientId).toBe(appRecord.clientId)
      },
    )

    test(
      'should be blocked if not allowed by config',
      async () => {
        global.process.env.ENABLE_PASSWORD_SIGN_IN = false as unknown as string
        const appRecord = await getApp(db)
        await insertUsers(db)
        const res = await postSignInRequest(
          db,
          appRecord,
        )
        expect(res.status).toBe(400)
        global.process.env.ENABLE_PASSWORD_SIGN_IN = true as unknown as string
      },
    )

    test(
      'should throw error if user not found',
      async () => {
        const appRecord = await getApp(db)
        await insertUsers(db)
        const res = await postSignInRequest(
          db,
          appRecord,
          { email: 'test1@email.com' },
        )
        expect(res.status).toBe(404)
        expect(await res.text()).toBe(localeConfig.Error.NoUser)
      },
    )

    test(
      'should throw error if user disabled',
      async () => {
        const appRecord = await getApp(db)
        await insertUsers(db)
        await disableUser(db)
        const res = await postSignInRequest(
          db,
          appRecord,
        )
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(localeConfig.Error.UserDisabled)
      },
    )

    test(
      'could lock access',
      async () => {
        global.process.env.ACCOUNT_LOCKOUT_THRESHOLD = 1 as unknown as string
        const appRecord = await getApp(db)
        await insertUsers(db)
        const res = await postSignInRequest(
          db,
          appRecord,
          { password: 'Password2!' },
        )
        expect(res.status).toBe(404)
        expect(await mockedKV.get(`${adapterConfig.BaseKVKey.FailedLoginAttempts}-test@email.com`)).toBe('1')

        const res2 = await postSignInRequest(
          db,
          appRecord,
          { password: 'Password2!' },
        )
        expect(res2.status).toBe(400)

        global.process.env.ACCOUNT_LOCKOUT_THRESHOLD = 0 as unknown as string
        const res3 = await postSignInRequest(
          db,
          appRecord,
          { password: 'Password2!' },
        )
        expect(res3.status).toBe(404)

        global.process.env.ACCOUNT_LOCKOUT_THRESHOLD = 1 as unknown as string
      },
    )

    test(
      'could disable account lock',
      async () => {
        global.process.env.ACCOUNT_LOCKOUT_THRESHOLD = 0 as unknown as string
        const appRecord = await getApp(db)
        await insertUsers(db)
        const res = await postSignInRequest(
          db,
          appRecord,
          { password: 'Password2!' },
        )
        expect(res.status).toBe(404)
        expect(await mockedKV.get(`${adapterConfig.BaseKVKey.FailedLoginAttempts}-test@email.com`)).toBeFalsy()

        const res2 = await postSignInRequest(
          db,
          appRecord,
          { password: 'Password2!' },
        )
        expect(res2.status).toBe(404)
        global.process.env.ACCOUNT_LOCKOUT_THRESHOLD = 0 as unknown as string
      },
    )
  },
)

describe(
  'get /authorize-account',
  () => {
    test(
      'should show sign up page',
      async () => {
        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect((document.getElementsByTagName('img')[0] as HTMLImageElement).src).toBe(global.process.env.COMPANY_LOGO_URL)
        expect(document.getElementsByName('email').length).toBe(1)
        expect(document.getElementsByName('password').length).toBe(1)
        expect(document.getElementsByName('confirmPassword').length).toBe(1)
        expect(document.getElementsByName('firstName').length).toBe(1)
        expect(document.getElementsByName('lastName').length).toBe(1)
        expect(document.getElementsByTagName('form').length).toBe(1)
        expect(document.getElementsByTagName('select').length).toBe(1)

        expect(html).not.toContain(localeConfig.authorizeAccount.bySignUp.en)
        expect(html).not.toContain(localeConfig.authorizeAccount.terms.en)
        expect(html).not.toContain(localeConfig.authorizeAccount.privacyPolicy.en)
      },
    )

    test(
      'could override branding using config',
      async () => {
        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        global.process.env.COMPANY_LOGO_URL = 'https://google.com'
        global.process.env.FONT_FAMILY = 'Roboto'
        global.process.env.FONT_URL = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400..600&display=swap'
        global.process.env.LAYOUT_COLOR = 'red'
        global.process.env.LABEL_COLOR = 'green'
        global.process.env.PRIMARY_BUTTON_COLOR = 'black'
        global.process.env.PRIMARY_BUTTON_LABEL_COLOR = 'gray'
        global.process.env.PRIMARY_BUTTON_BORDER_COLOR = 'orange'
        global.process.env.SECONDARY_BUTTON_COLOR = 'darkred'
        global.process.env.SECONDARY_BUTTON_LABEL_COLOR = 'darkgray'
        global.process.env.SECONDARY_BUTTON_BORDER_COLOR = 'blue'
        global.process.env.CRITICAL_INDICATOR_COLOR = 'yellow'

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect((document.getElementsByTagName('img')[0] as HTMLImageElement).src).toBe('https://google.com/')

        const bodyElement = dom.window.getComputedStyle(document.querySelector('body') as HTMLElement)
        expect(bodyElement.fontFamily).toBe('Roboto')

        const linkElements = document.querySelectorAll('link[rel="stylesheet"]') as unknown as HTMLLinkElement[]
        const matchingLink = Array.from(linkElements).find((link) => link.href === 'https://fonts.googleapis.com/css2?family=Roboto:wght@400..600&display=swap')
        expect(matchingLink).toBeTruthy()

        const mainElementStyle = dom.window.getComputedStyle(document.querySelector('.main') as HTMLElement)
        expect(mainElementStyle.backgroundColor).toBe('rgb(255, 0, 0)')
        expect(mainElementStyle.color).toBe('rgb(0, 128, 0)')

        const primaryButtonStyle = dom.window.getComputedStyle(document.querySelector('.button') as HTMLElement)
        expect(primaryButtonStyle.backgroundColor).toBe('rgb(0, 0, 0)')
        expect(primaryButtonStyle.color).toBe('rgb(128, 128, 128)')
        expect(primaryButtonStyle.border).toBe('1px solid orange')

        const secondaryButtonStyle = dom.window.getComputedStyle(document.querySelector('.button-secondary') as HTMLElement)
        expect(secondaryButtonStyle.backgroundColor).toBe('rgb(139, 0, 0)')
        expect(secondaryButtonStyle.color).toBe('rgb(169, 169, 169)')
        expect(secondaryButtonStyle.border).toBe('1px solid blue')

        const textRedStyle = dom.window.getComputedStyle(document.querySelector('.text-red') as HTMLElement)
        const alert = dom.window.getComputedStyle(document.querySelector('.alert') as HTMLElement)
        expect(textRedStyle.color).toBe('rgb(255, 255, 0)')
        expect(alert.backgroundColor).toBe('rgb(255, 255, 0)')

        global.process.env.COMPANY_LOGO_URL = 'https://raw.githubusercontent.com/ValueMelody/melody-homepage/main/logo.jpg'
        global.process.env.FONT_FAMILY = 'Inter'
        global.process.env.FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..600&display=swap'
        global.process.env.LAYOUT_COLOR = 'lightgray'
        global.process.env.LABEL_COLOR = 'black'
        global.process.env.PRIMARY_BUTTON_COLOR = 'white'
        global.process.env.PRIMARY_BUTTON_LABEL_COLOR = 'black'
        global.process.env.PRIMARY_BUTTON_BORDER_COLOR = 'lightgray'
        global.process.env.SECONDARY_BUTTON_COLOR = 'white'
        global.process.env.SECONDARY_BUTTON_LABEL_COLOR = 'black'
        global.process.env.SECONDARY_BUTTON_BORDER_COLOR = 'white'
        global.process.env.CRITICAL_INDICATOR_COLOR = '#e00'
      },
    )

    test(
      'could override branding url using org config',
      async () => {
        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        global.process.env.ENABLE_ORG = true as unknown as string

        db.exec(`
          insert into "org" (
            name, slug, "companyLogoUrl", "layoutColor", "labelColor",
            "primaryButtonColor", "primaryButtonLabelColor", "primaryButtonBorderColor",
            "secondaryButtonColor", "secondaryButtonLabelColor", "secondaryButtonBorderColor",
            "criticalIndicatorColor", "fontUrl", "fontFamily"
          ) values (
            'test', 'default', 'https://test.com', 'red', 'green', 'black', 'gray', 'orange', 'darkred', 'darkgray', 'blue', 'yellow',
            'http://font.com', 'Arial'
          )
        `)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}&org=default`,
          {},
          mock(db),
        )

        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect((document.getElementsByTagName('img')[0] as HTMLImageElement).src).toBe('https://test.com/')

        const bodyElement = dom.window.getComputedStyle(document.querySelector('body') as HTMLElement)
        expect(bodyElement.fontFamily).toBe('Arial')

        const linkElements = document.querySelectorAll('link[rel="stylesheet"]') as unknown as HTMLLinkElement[]
        const matchingLink = Array.from(linkElements).find((link) => link.href === 'http://font.com/')
        expect(matchingLink).toBeTruthy()

        const mainElementStyle = dom.window.getComputedStyle(document.querySelector('.main') as HTMLElement)
        expect(mainElementStyle.backgroundColor).toBe('rgb(255, 0, 0)')
        expect(mainElementStyle.color).toBe('rgb(0, 128, 0)')

        const primaryButtonStyle = dom.window.getComputedStyle(document.querySelector('.button') as HTMLElement)
        expect(primaryButtonStyle.backgroundColor).toBe('rgb(0, 0, 0)')
        expect(primaryButtonStyle.color).toBe('rgb(128, 128, 128)')
        expect(primaryButtonStyle.border).toBe('1px solid orange')

        const secondaryButtonStyle = dom.window.getComputedStyle(document.querySelector('.button-secondary') as HTMLElement)
        expect(secondaryButtonStyle.backgroundColor).toBe('rgb(139, 0, 0)')
        expect(secondaryButtonStyle.color).toBe('rgb(169, 169, 169)')
        expect(secondaryButtonStyle.border).toBe('1px solid blue')

        const textRedStyle = dom.window.getComputedStyle(document.querySelector('.text-red') as HTMLElement)
        const alert = dom.window.getComputedStyle(document.querySelector('.alert') as HTMLElement)
        expect(textRedStyle.color).toBe('rgb(255, 255, 0)')
        expect(alert.backgroundColor).toBe('rgb(255, 255, 0)')

        global.process.env.ENABLE_ORG = false as unknown as string
      },
    )

    test(
      'could disable locale selector',
      async () => {
        global.process.env.ENABLE_LOCALE_SELECTOR = false as unknown as string
        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByTagName('select').length).toBe(0)
        global.process.env.ENABLE_LOCALE_SELECTOR = true as unknown as string
      },
    )

    test(
      'should be suppressed if not enabled in config',
      async () => {
        global.process.env.ENABLE_SIGN_UP = false as unknown as string
        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}`,
          {},
          mock(db),
        )
        expect(res.status).toBe(400)
        global.process.env.ENABLE_SIGN_UP = true as unknown as string
      },
    )

    test(
      'could suppress names',
      async () => {
        global.process.env.ENABLE_NAMES = false as unknown as string

        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}/${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByName('firstName').length).toBe(0)
        expect(document.getElementsByName('lastName').length).toBe(0)
        global.process.env.ENABLE_NAMES = true as unknown as string
      },
    )

    test(
      'could require names',
      async () => {
        global.process.env.NAMES_IS_REQUIRED = true as unknown as string

        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        const firstNameLabel = document.getElementsByTagName('label')[3].innerHTML
        const lastNameLabel = document.getElementsByTagName('label')[4].innerHTML
        expect(firstNameLabel).toContain(localeConfig.authorizeAccount.firstName.en)
        expect(firstNameLabel).toContain('*')
        expect(lastNameLabel).toContain(localeConfig.authorizeAccount.lastName.en)
        expect(lastNameLabel).toContain('*')
        global.process.env.NAMES_IS_REQUIRED = false as unknown as string
      },
    )

    test(
      'could show terms and privacy policy',
      async () => {
        global.process.env.TERMS_LINK = 'https://google.com'
        global.process.env.PRIVACY_POLICY_LINK = 'https://microsoft.com'
        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()

        expect(html).toContain(localeConfig.authorizeAccount.bySignUp.en)
        expect(html).toContain('href="https://google.com"')
        expect(html).toContain(localeConfig.authorizeAccount.terms.en)
        expect(html).toContain('href="https://microsoft.com"')
        expect(html).toContain(localeConfig.authorizeAccount.privacyPolicy.en)
        global.process.env.TERMS_LINK = ''
        global.process.env.PRIVACY_POLICY_LINK = ''
      },
    )

    test(
      'could override terms and privacy condition url using org config',
      async () => {
        global.process.env.TERMS_LINK = 'https://google.com'
        global.process.env.PRIVACY_POLICY_LINK = 'https://microsoft.com'
        global.process.env.ENABLE_ORG = true as unknown as string

        db.exec('insert into "org" (name, slug, "termsLink", "privacyPolicyLink") values (\'test\', \'default\', \'https://google1.com\', \'https://microsoft1.com\')')

        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}&org=default`,
          {},
          mock(db),
        )

        const html = await res.text()

        expect(html).not.toContain('href="https://google.com"')
        expect(html).not.toContain('href="https://microsoft.com"')
        expect(html).toContain('href="https://google1.com"')
        expect(html).toContain('href="https://microsoft1.com"')

        global.process.env.ENABLE_ORG = false as unknown as string
        global.process.env.TERMS_LINK = ''
        global.process.env.PRIVACY_POLICY_LINK = ''
      },
    )

    test(
      'could only show terms',
      async () => {
        global.process.env.TERMS_LINK = 'https://google.com'
        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()

        expect(html).toContain(localeConfig.authorizeAccount.bySignUp.en)
        expect(html).toContain('href="https://google.com"')
        expect(html).toContain(localeConfig.authorizeAccount.terms.en)
        expect(html).not.toContain(localeConfig.authorizeAccount.privacyPolicy.en)
        global.process.env.TERMS_LINK = ''
      },
    )

    test(
      'could only show privacy policy',
      async () => {
        global.process.env.PRIVACY_POLICY_LINK = 'https://microsoft.com'
        const appRecord = await getApp(db)
        const params = await getAuthorizeParams(appRecord)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeAccount}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()

        expect(html).toContain(localeConfig.authorizeAccount.bySignUp.en)
        expect(html).not.toContain(localeConfig.authorizeAccount.terms.en)
        expect(html).toContain('href="https://microsoft.com"')
        expect(html).toContain(localeConfig.authorizeAccount.privacyPolicy.en)
        global.process.env.PRIVACY_POLICY_LINK = ''
      },
    )
  },
)

const postAuthorizeAccount = async () => {
  const appRecord = await getApp(db)
  const body = {
    ...(await postAuthorizeBody(appRecord)),
    email: 'test@email.com',
    password: 'Password1!',
  }

  const res = await app.request(
    routeConfig.IdentityRoute.AuthorizeAccount,
    {
      method: 'POST', body: JSON.stringify(body),
    },
    mock(db),
  )
  return res
}

describe(
  'post /authorize-account',
  () => {
    test(
      'should get auth code after sign up',
      async () => {
        process.env.ENABLE_USER_APP_CONSENT = false as unknown as string
        const mockFetch = vi.fn(async () => {
          return Promise.resolve({ ok: true })
        })
        global.fetch = mockFetch as Mock

        const res = await postAuthorizeAccount()
        const json = await res.json()
        expect(json).toStrictEqual({
          code: expect.any(String),
          redirectUri: 'http://localhost:3000/en/dashboard',
          state: '123',
          scopes: ['profile', 'openid', 'offline_access'],
          nextPage: routeConfig.IdentityRoute.AuthorizeMfaEnroll,
        })
        const appRecord = await getApp(db)
        const { code } = json as { code: string }
        const codeStore = JSON.parse(await mockedKV.get(`${adapterConfig.BaseKVKey.AuthCode}-${code}`) ?? '') as AuthCodeBody
        expect(codeStore.appId).toBe(1)
        expect(codeStore.appName).toBe(appRecord.name)
        expect(codeStore.request.clientId).toBe(appRecord.clientId)

        const verificationCode = await mockedKV.get(`${adapterConfig.BaseKVKey.EmailVerificationCode}-1`) ?? ''
        expect(verificationCode.length).toBe(6)

        expect(mockFetch).toBeCalledTimes(1)

        const callArgs = mockFetch.mock.calls[0] as any[]
        const body = (callArgs[1] as unknown as { body: string }).body
        expect(callArgs[0]).toBe('https://api.sendgrid.com/v3/mail/send')
        expect(body).toContain(verificationCode)
        expect(body).toContain(localeConfig.emailVerificationEmail.verify.en)
        expect(body).toContain(`${routeConfig.IdentityRoute.VerifyEmail}?id=${codeStore.user.authId}&amp;locale=en`)

        global.fetch = fetchMock
        process.env.ENABLE_USER_APP_CONSENT = true as unknown as string
      },
    )

    test(
      'could override verification email with branding config',
      async () => {
        process.env.COMPANY_LOGO_URL = 'https://google.com'

        const mockFetch = vi.fn(async () => {
          return Promise.resolve({ ok: true })
        })
        global.fetch = mockFetch as Mock

        await postAuthorizeAccount()

        const callArgs = mockFetch.mock.calls[0] as any[]
        const emailBody = (callArgs[1] as unknown as { body: string }).body
        expect(callArgs[0]).toBe('https://api.sendgrid.com/v3/mail/send')
        expect(emailBody).toContain('https://google.com')
        expect(emailBody).not.toContain('https://raw.githubusercontent.com/ValueMelody/melody-homepage/main/logo.jpg')

        global.fetch = fetchMock
        process.env.COMPANY_LOGO_URL = 'https://raw.githubusercontent.com/ValueMelody/melody-homepage/main/logo.jpg'
      },
    )

    test(
      'should store org slug after sign up',
      async () => {
        process.env.ENABLE_ORG = true as unknown as string

        const mockFetch = vi.fn(async () => {
          return Promise.resolve({ ok: true })
        })
        global.fetch = mockFetch as Mock

        db.exec('insert into "org" (name, slug, "companyLogoUrl") values (\'test\', \'default\', \'https://test.com\')')

        const appRecord = await getApp(db)
        const body = {
          ...(await postAuthorizeBody(appRecord)),
          email: 'test@email.com',
          password: 'Password1!',
          org: 'default',
        }

        await app.request(
          routeConfig.IdentityRoute.AuthorizeAccount,
          {
            method: 'POST', body: JSON.stringify(body),
          },
          mock(db),
        )

        const currentUser = await db.prepare('select * from "user" where id = 1').get() as userModel.Raw
        expect(currentUser.orgSlug).toBe('default')

        const callArgs = mockFetch.mock.calls[0] as any[]
        const emailBody = (callArgs[1] as unknown as { body: string }).body
        expect(callArgs[0]).toBe('https://api.sendgrid.com/v3/mail/send')
        expect(emailBody).toContain('https://test.com')
        expect(emailBody).not.toContain(process.env.COMPANY_LOGO_URL)

        process.env.ENABLE_ORG = false as unknown as string
      },
    )

    test(
      'should throw error if email exists',
      async () => {
        const res = await postAuthorizeAccount()
        expect(res.status).toBe(200)
        const res1 = await postAuthorizeAccount()
        expect(res1.status).toBe(400)
        expect(await res1.text()).toBe(localeConfig.Error.EmailTaken)
      },
    )

    test(
      'could disable email verification',
      async () => {
        global.process.env.ENABLE_EMAIL_VERIFICATION = false as unknown as string
        await postAuthorizeAccount()
        expect(await mockedKV.get(`${adapterConfig.BaseKVKey.EmailVerificationCode}-1`)).toBeFalsy()
        global.process.env.ENABLE_EMAIL_VERIFICATION = true as unknown as string
      },
    )

    test(
      'could force otp mfa',
      async () => {
        global.process.env.OTP_MFA_IS_REQUIRED = true as unknown as string
        global.process.env.ENABLE_USER_APP_CONSENT = false as unknown as string
        const res = await postAuthorizeAccount()
        const json = await res.json()
        expect(json).toStrictEqual({
          code: expect.any(String),
          redirectUri: 'http://localhost:3000/en/dashboard',
          state: '123',
          scopes: ['profile', 'openid', 'offline_access'],
          nextPage: routeConfig.IdentityRoute.AuthorizeOtpSetup,
        })
        global.process.env.OTP_MFA_IS_REQUIRED = false as unknown as string
        global.process.env.ENABLE_USER_APP_CONSENT = true as unknown as string
      },
    )

    test(
      'could force email mfa',
      async () => {
        global.process.env.EMAIL_MFA_IS_REQUIRED = true as unknown as string
        global.process.env.ENABLE_USER_APP_CONSENT = false as unknown as string
        const res = await postAuthorizeAccount()
        const json = await res.json()
        expect(json).toStrictEqual({
          code: expect.any(String),
          redirectUri: 'http://localhost:3000/en/dashboard',
          state: '123',
          scopes: ['profile', 'openid', 'offline_access'],
          nextPage: routeConfig.IdentityRoute.AuthorizeEmailMfa,
        })
        global.process.env.EMAIL_MFA_IS_REQUIRED = false as unknown as string
        global.process.env.ENABLE_USER_APP_CONSENT = true as unknown as string
      },
    )

    test(
      'could force sms mfa',
      async () => {
        global.process.env.SMS_MFA_IS_REQUIRED = true as unknown as string
        global.process.env.ENABLE_USER_APP_CONSENT = false as unknown as string
        const res = await postAuthorizeAccount()
        const json = await res.json()
        expect(json).toStrictEqual({
          code: expect.any(String),
          redirectUri: 'http://localhost:3000/en/dashboard',
          state: '123',
          scopes: ['profile', 'openid', 'offline_access'],
          nextPage: routeConfig.IdentityRoute.AuthorizeSmsMfa,
        })
        global.process.env.SMS_MFA_IS_REQUIRED = false as unknown as string
        global.process.env.ENABLE_USER_APP_CONSENT = true as unknown as string
      },
    )

    test(
      'could skip mfa',
      async () => {
        global.process.env.ENFORCE_ONE_MFA_ENROLLMENT = [] as unknown as string
        global.process.env.ENABLE_USER_APP_CONSENT = false as unknown as string
        const res = await postAuthorizeAccount()
        const json = await res.json()
        expect(json).toStrictEqual({
          code: expect.any(String),
          redirectUri: 'http://localhost:3000/en/dashboard',
          state: '123',
          scopes: ['profile', 'openid', 'offline_access'],
        })
        global.process.env.ENFORCE_ONE_MFA_ENROLLMENT = ['email', 'otp'] as unknown as string
        global.process.env.ENABLE_USER_APP_CONSENT = true as unknown as string
      },
    )

    test(
      'could skip consent',
      async () => {
        global.process.env.ENABLE_USER_APP_CONSENT = false as unknown as string
        const res = await postAuthorizeAccount()
        const json = await res.json()
        expect(json).toStrictEqual({
          code: expect.any(String),
          redirectUri: 'http://localhost:3000/en/dashboard',
          state: '123',
          scopes: ['profile', 'openid', 'offline_access'],
          nextPage: routeConfig.IdentityRoute.AuthorizeMfaEnroll,
        })
        global.process.env.ENABLE_USER_APP_CONSENT = true as unknown as string
      },
    )

    test(
      'could set names as required',
      async () => {
        global.process.env.NAMES_IS_REQUIRED = true as unknown as string

        const res = await postAuthorizeAccount()
        expect(res.status).toBe(400)

        global.process.env.NAMES_IS_REQUIRED = false as unknown as string
      },
    )
  },
)

describe(
  'get /authorize-consent',
  () => {
    test(
      'should show consent page',
      async () => {
        await insertUsers(
          db,
          false,
        )
        const params = await prepareFollowUpParams(db)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeConsent}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        expect(html).toContain('Access your basic profile information')
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByTagName('select').length).toBe(1)
        expect(document.getElementsByTagName('button').length).toBe(2)
        expect(document.getElementsByTagName('button')[0].innerHTML).toBe(localeConfig.authorizeConsent.decline.en)
        expect(document.getElementsByTagName('button')[1].innerHTML).toBe(localeConfig.authorizeConsent.accept.en)
      },
    )

    test(
      'should redirect if use wrong auth code',
      async () => {
        await insertUsers(
          db,
          false,
        )
        await prepareFollowUpParams(db)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeConsent}?locale=en&code=abc`,
          {},
          mock(db),
        )
        expect(res.status).toBe(302)
        expect(res.headers.get('Location')).toBe(`${routeConfig.IdentityRoute.AuthCodeExpired}?locale=en`)
      },
    )

    test(
      'could disable locale selector',
      async () => {
        global.process.env.ENABLE_LOCALE_SELECTOR = false as unknown as string
        await insertUsers(
          db,
          false,
        )
        const params = await prepareFollowUpParams(db)

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeConsent}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        const dom = new JSDOM(html)
        const document = dom.window.document
        expect(document.getElementsByTagName('select').length).toBe(0)
        global.process.env.ENABLE_LOCALE_SELECTOR = true as unknown as string
      },
    )

    test(
      'should show scope name if locale not provided',
      async () => {
        await insertUsers(
          db,
          false,
        )
        const params = await prepareFollowUpParams(db)
        await db.prepare('delete from scope_locale').run()

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeConsent}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        expect(html).toContain('profile')
      },
    )

    test(
      'should not throw error if scope not found',
      async () => {
        await insertUsers(
          db,
          false,
        )
        const params = await prepareFollowUpParams(db)
        await db.prepare('update scope set "deletedAt" = ?').run('2024')

        const res = await app.request(
          `${routeConfig.IdentityRoute.AuthorizeConsent}${params}`,
          {},
          mock(db),
        )

        const html = await res.text()
        expect(html).not.toContain('profile')
      },
    )
  },
)

describe(
  'post /authorize-consent',
  () => {
    test(
      'should consent',
      async () => {
        await insertUsers(
          db,
          false,
        )
        const body = await prepareFollowUpBody(db)

        const res = await app.request(
          routeConfig.IdentityRoute.AuthorizeConsent,
          {
            method: 'POST', body: JSON.stringify(body),
          },
          mock(db),
        )
        const json = await res.json()
        expect(json).toStrictEqual({
          code: expect.any(String),
          redirectUri: 'http://localhost:3000/en/dashboard',
          state: '123',
          scopes: ['profile', 'openid', 'offline_access'],
          nextPage: routeConfig.IdentityRoute.AuthorizeMfaEnroll,
        })
        const consent = db.prepare('SELECT * from user_app_consent WHERE "userId" = 1 AND "appId" = 1').get()
        expect(consent).toBeTruthy()
      },
    )

    test(
      'should throw error if use wrong auth code',
      async () => {
        await insertUsers(
          db,
          false,
        )
        await prepareFollowUpBody(db)

        const res = await app.request(
          routeConfig.IdentityRoute.AuthorizeConsent,
          {
            method: 'POST',
            body: JSON.stringify({
              locale: 'en',
              code: 'abc',
            }),
          },
          mock(db),
        )
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(localeConfig.Error.WrongAuthCode)
      },
    )
  },
)

describe(
  'post /logout',
  () => {
    const prepareLogout = async () => {
      const appRecord = await getApp(db)
      await insertUsers(db)
      const res = await postSignInRequest(
        db,
        appRecord,
      )

      const json = await res.json() as { code: string }

      const body = {
        grant_type: oauthDto.TokenGrantType.AuthorizationCode,
        code: json.code,
        code_verifier: 'abc',
      }
      const tokenRes = await app.request(
        routeConfig.OauthRoute.Token,
        {
          method: 'POST',
          body: new URLSearchParams(body).toString(),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
        mock(db),
      )
      const tokenJson = await tokenRes.json() as { refresh_token: string; access_token: string }

      const tokenBody = await mockedKV.get(`${adapterConfig.BaseKVKey.RefreshToken}-${tokenJson.refresh_token}`)
      expect(JSON.parse(tokenBody ?? '')).toStrictEqual({
        authId: '1-1-1-1',
        clientId: appRecord.clientId,
        scope: 'profile openid offline_access',
        roles: [],
      })

      return tokenJson
    }

    test(
      'should logout',
      async () => {
        global.process.env.ENFORCE_ONE_MFA_ENROLLMENT = [] as unknown as string
        const appRecord = await getApp(db)
        const tokenJson = await prepareLogout()

        const logoutRes = await app.request(
          routeConfig.IdentityRoute.Logout,
          {
            method: 'POST',
            body: new URLSearchParams({
              refresh_token: tokenJson.refresh_token,
              post_logout_redirect_uri: '/',
            }).toString(),
            headers: {
              Authorization: `Bearer ${tokenJson.access_token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
          mock(db),
        )
        expect(await logoutRes.json()).toStrictEqual({
          success: true,
          redirectUri: `http://localhost:8787${routeConfig.OauthRoute.Logout}?post_logout_redirect_uri=/&client_id=${appRecord.clientId}`,
        })

        expect(await mockedKV.get(`${adapterConfig.BaseKVKey.RefreshToken}-${tokenJson.refresh_token}`)).toBeFalsy()

        global.process.env.ENFORCE_ONE_MFA_ENROLLMENT = ['email', 'otp'] as unknown as string
      },
    )

    test(
      'could logout without post logout redirect uri',
      async () => {
        global.process.env.ENFORCE_ONE_MFA_ENROLLMENT = [] as unknown as string
        const appRecord = await getApp(db)
        const tokenJson = await prepareLogout()

        const logoutRes = await app.request(
          routeConfig.IdentityRoute.Logout,
          {
            method: 'POST',
            body: new URLSearchParams({ refresh_token: tokenJson.refresh_token }).toString(),
            headers: {
              Authorization: `Bearer ${tokenJson.access_token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
          mock(db),
        )
        expect(await logoutRes.json()).toStrictEqual({
          success: true,
          redirectUri: `http://localhost:8787${routeConfig.OauthRoute.Logout}?post_logout_redirect_uri=&client_id=${appRecord.clientId}`,
        })

        expect(await mockedKV.get(`${adapterConfig.BaseKVKey.RefreshToken}-${tokenJson.refresh_token}`)).toBeFalsy()

        global.process.env.ENFORCE_ONE_MFA_ENROLLMENT = ['email', 'otp'] as unknown as string
      },
    )

    test(
      'should pass through even if token has wrong client',
      async () => {
        global.process.env.ENFORCE_ONE_MFA_ENROLLMENT = [] as unknown as string
        const appRecord = await getApp(db)
        await insertUsers(db)
        const res = await postSignInRequest(
          db,
          appRecord,
        )

        const json = await res.json() as { code: string }

        const body = {
          grant_type: oauthDto.TokenGrantType.AuthorizationCode,
          code: json.code,
          code_verifier: 'abc',
        }
        const tokenRes = await app.request(
          routeConfig.OauthRoute.Token,
          {
            method: 'POST',
            body: new URLSearchParams(body).toString(),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          },
          mock(db),
        )
        const tokenJson = await tokenRes.json() as { refresh_token: string; access_token: string }

        const tokenKey = `${adapterConfig.BaseKVKey.RefreshToken}-${tokenJson.refresh_token}`
        await mockedKV.put(
          tokenKey,
          JSON.stringify({
            ...JSON.parse(await mockedKV.get(tokenKey) ?? ''), authId: '123',
          }),
        )
        const logoutRes = await app.request(
          routeConfig.IdentityRoute.Logout,
          {
            method: 'POST',
            body: new URLSearchParams({
              refresh_token: tokenJson.refresh_token,
              post_logout_redirect_uri: '/',
            }).toString(),
            headers: {
              Authorization: `Bearer ${tokenJson.access_token}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
          mock(db),
        )
        expect(logoutRes.status).toBe(200)
        expect(await logoutRes.json()).toStrictEqual({
          success: true,
          redirectUri: `http://localhost:8787${routeConfig.OauthRoute.Logout}?post_logout_redirect_uri=/&client_id=${appRecord.clientId}`,
        })

        global.process.env.ENFORCE_ONE_MFA_ENROLLMENT = ['email', 'otp'] as unknown as string
      },
    )
  },
)
