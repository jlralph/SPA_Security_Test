import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users').then(m => m.UsersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'items',
    loadComponent: () => import('./pages/items/items').then(m => m.ItemsComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'home' }
];
