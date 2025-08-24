import { Routes } from "@angular/router";

export const routes: Routes = [
    {
        path: 'home',
        loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    },
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
    },
  {
    path: 'new-entry',
    loadComponent: () => import('./new-entry/new-entry.page').then( m => m.NewEntryPage)
  },
  {
    path: 'specific-day',
    loadComponent: () => import('./specific-day/specific-day.page').then( m => m.SpecificDayPage)
  },
  {
    path: 'unlock',
    loadComponent: () => import('./unlock/unlock.page').then( m => m.UnlockPage)
  },


];
