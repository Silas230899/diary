import { Routes } from "@angular/router";
import {onboardingGuard} from "./guards/onboarding-guard";

export const routes: Routes = [
    {
        path: 'home',
        canActivate: [onboardingGuard],
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    },
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
    },
  {
    path: 'specific-day',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./specific-day/specific-day.page').then( m => m.SpecificDayPage)
  },
  {
    path: 'unlock',
    loadComponent: () => import('./unlock/unlock.page').then( m => m.UnlockPage)
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./onboarding/onboarding.page').then( m => m.OnboardingPage)
  },



];
