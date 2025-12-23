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
    const loginPath = router.parseUrl("/login")
    const passwordExpirationDate = localStorage.getItem("passwordExpirationDate");
    if(passwordExpirationDate !== null) {
      console.log("PasswordExpirationDate: " + passwordExpirationDate);
      if(new Date(passwordExpirationDate).getTime() > new Date().getTime()) {
        const password = localStorage.getItem("password")
        if(password !== null) {
          const salt = await passwordService.readSalt()
          //localStorage.setItem("password", password)
          localStorage.setItem("passwordExpirationDate", new Date(new Date().getTime() + 10 * 60 * 1000).toISOString())
          await crypto.initMasterKey(password, salt)
          //await this.navCtrl.navigateRoot("home")
          return true
        }
      } else localStorage.removeItem("password")
    } else localStorage.removeItem("password")
    // account is created, login with biometry or password
    return new RedirectCommand(loginPath)
  } else {
    // no account yet, create it first
    const onboardingPath = router.parseUrl("/onboarding")
    return new RedirectCommand(onboardingPath, { skipLocationChange: true })
  }
};
