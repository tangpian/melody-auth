import {
  useCallback, useState,
} from 'hono/jsx'
import { View } from '.'
import {
  localeConfig, typeConfig, routeConfig,
} from 'configs'

const useSubmitError = ({
  onSwitchView,
  locale,
}: {
  onSwitchView: (view: View) => void;
  locale: typeConfig.Locale;
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmitError = useCallback(
    (error: any) => {
      if (error === null) {
        setSubmitError(null)
        return
      }

      const errorString = String(error)

      let msg = localeConfig.requestError.authFailed[locale]

      if (errorString.indexOf('isEmail') !== -1 || errorString === localeConfig.validateError.isNotEmail[locale]) {
        msg = localeConfig.validateError.isNotEmail[locale]
      } else if (errorString.indexOf('isStrongPassword') !== -1) {
        msg = localeConfig.validateError.isWeakPassword[locale]
      } else if (errorString.indexOf(localeConfig.Error.NoUser) !== -1) {
        msg = localeConfig.requestError.noUser[locale]
      } else if (errorString.indexOf(localeConfig.Error.UserDisabled) !== -1) {
        msg = localeConfig.requestError.disabledUser[locale]
      } else if (errorString.indexOf(localeConfig.Error.AccountLocked) !== -1) {
        msg = localeConfig.requestError.accountLocked[locale]
      } else if (errorString.indexOf(localeConfig.Error.OtpMfaLocked) !== -1) {
        msg = localeConfig.requestError.optMfaLocked[locale]
      } else if (errorString.indexOf(localeConfig.Error.SmsMfaLocked) !== -1) {
        msg = localeConfig.requestError.smsMfaLocked[locale]
      } else if (errorString.indexOf(localeConfig.Error.EmailMfaLocked) !== -1) {
        msg = localeConfig.requestError.emailMfaLocked[locale]
      } else if (errorString.indexOf(localeConfig.Error.PasswordResetLocked) !== -1) {
        msg = localeConfig.requestError.passwordResetLocked[locale]
      } else if (errorString.indexOf(localeConfig.Error.EmailTaken) !== -1) {
        msg = localeConfig.requestError.emailTaken[locale]
      } else if (errorString.indexOf(localeConfig.Error.WrongCode) !== -1) {
        msg = localeConfig.requestError.wrongCode[locale]
      } else if (errorString.indexOf(localeConfig.Error.RequireDifferentPassword) !== -1) {
        msg = localeConfig.requestError.requireNewPassword[locale]
      } else if (errorString.indexOf(localeConfig.Error.WrongMfaCode) !== -1) {
        msg = localeConfig.requestError.wrongCode[locale]
      } else if (errorString.indexOf(localeConfig.Error.WrongAuthCode) !== -1) {
        const currentUrl = new URL(window.location.href)
        const newUrl = new URL(`${window.location.origin}${routeConfig.IdentityRoute.AuthCodeExpiredView}`)
        newUrl.searchParams.set(
          'locale',
          locale,
        )
        newUrl.searchParams.set(
          'redirect_uri',
          currentUrl.searchParams.get('redirect_uri') ?? '',
        )
        window.history.pushState(
          {},
          '',
          newUrl,
        )

        onSwitchView(View.AuthCodeExpired)
      }

      setSubmitError(msg)
    },
    [locale, onSwitchView],
  )

  return {
    submitError, handleSubmitError,
  }
}

export default useSubmitError
