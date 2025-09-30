import {CanActivateFn, RedirectCommand, Router} from '@angular/router';
import {inject} from "@angular/core";
import {PasswordService} from "../services/password.service";
import {CryptoService} from "../services/crypto.service";

export const onboardingGuard: CanActivateFn = async (route, state) => {
  const passwordService = inject(PasswordService)
  const router = inject(Router);
  const crypto = inject(CryptoService);
  if(crypto.isMasterKeyInitialized()) return true
  else if(await passwordService.saltExists()) {
    // account is created, login with biometry or password
    const loginPath = router.parseUrl("/login")
    return new RedirectCommand(loginPath)
  } else {
    // no account yet, create it first
    const onboardingPath = router.parseUrl("/onboarding")
    return new RedirectCommand(onboardingPath, { skipLocationChange: true })
  }
};
