import {
  localeConfig, typeConfig,
} from 'configs'
import {
  Field, PrimaryButton, SecondaryButton, ViewTitle,
  PasswordField, GoogleSignIn, GithubSignIn, SubmitError, FacebookSignIn,
} from 'pages/components'
import {
  View, useSubmitError, useSignInForm,
  useInitialProps, usePasskeyVerifyForm,
} from 'pages/hooks'
import { getAuthorizeParams } from 'pages/tools/param'

export interface PasswordViewProps {
  locale: typeConfig.Locale;
  onSwitchView: (view: View, response?: any) => void;
}

const SignIn = ({
  locale,
  onSwitchView,
}: PasswordViewProps) => {
  const { initialProps } = useInitialProps()
  const params = getAuthorizeParams()

  const {
    submitError, handleSubmitError,
  } = useSubmitError({
    onSwitchView,
    locale,
  })
  const {
    values, errors, handleChange, handleSubmit,
  } = useSignInForm({
    locale,
    params,
    onSubmitError: handleSubmitError,
    onSwitchView,
  })

  const {
    passkeyOption, getPasskeyOption,
    handleVerifyPasskey,
  } = usePasskeyVerifyForm({
    params,
    email: values.email,
    locale,
    onSubmitError: handleSubmitError,
    onSwitchView,
  })

  const shouldLoadPasskeyInfo = initialProps.allowPasskey && passkeyOption === null

  return (
    <>
      {initialProps.allowPasskey && <script src='https://unpkg.com/@simplewebauthn/browser/dist/bundle/index.umd.min.js'></script>}
      <ViewTitle title={localeConfig.authorizePassword.title[locale]} />
      <form
        autoComplete='on'
        onSubmit={handleSubmit}
      >
        <section className='flex flex-col gap-2'>
          {initialProps.enablePasswordSignIn && (
            <>
              <Field
                label={localeConfig.authorizePassword.email[locale]}
                type='email'
                required
                value={values.email}
                name='email'
                autoComplete='email'
                error={errors.email}
                onChange={(value) => handleChange(
                  'email',
                  value,
                )}
              />

              {!!passkeyOption && (
                <PrimaryButton
                  type='button'
                  className='mt-2 mb-4'
                  title={localeConfig.authorizePassword.withPasskey[locale]}
                  onClick={handleVerifyPasskey}
                />
              )}

              {!shouldLoadPasskeyInfo && (
                <PasswordField
                  label={localeConfig.authorizePassword.password[locale]}
                  required
                  name='password'
                  value={values.password}
                  error={errors.password}
                  autoComplete='current-password'
                  onChange={(value) => handleChange(
                    'password',
                    value,
                  )}
                />
              )}
            </>
          )}
          <SubmitError error={submitError} />
          {shouldLoadPasskeyInfo && (
            <PrimaryButton
              type='button'
              className='mt-4'
              title={localeConfig.authorizePassword.continue[locale]}
              onClick={getPasskeyOption}
            />
          )}
          {initialProps.enablePasswordSignIn && !shouldLoadPasskeyInfo && (
            <PrimaryButton
              className='mt-4'
              title={localeConfig.authorizePassword.submit[locale]}
              type='submit'
            />
          )}
        </section>
        {(initialProps.googleClientId || initialProps.facebookClientId || initialProps.githubClientId) && (
          <section className='flex flex-col gap-4 mt-4'>
            <GoogleSignIn
              googleClientId={initialProps.googleClientId}
              locale={locale}
              params={params}
              handleSubmitError={handleSubmitError}
            />
            <FacebookSignIn
              facebookClientId={initialProps.facebookClientId}
              locale={locale}
              params={params}
              handleSubmitError={handleSubmitError}
            />
            <GithubSignIn
              githubClientId={initialProps.githubClientId}
              locale={locale}
              params={params}
              handleSubmitError={handleSubmitError}
            />
          </section>
        )}
      </form>
      {(initialProps.enableSignUp || initialProps.enablePasswordReset) && (
        <section className='flex flex-col gap-2'>
          {initialProps.enableSignUp && (
            <SecondaryButton
              title={localeConfig.authorizePassword.signUp[locale]}
              onClick={() => onSwitchView(View.SignUp)}
            />
          )}
          {initialProps.enablePasswordReset && (
            <SecondaryButton
              title={localeConfig.authorizePassword.passwordReset[locale]}
              onClick={() => onSwitchView(View.ResetPassword)}
            />
          )}
        </section>
      )}
    </>
  )
}

export default SignIn
