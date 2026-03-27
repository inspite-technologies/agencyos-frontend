import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AgencyService } from './agency.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const agencyService = inject(AgencyService);

  // Ensure service is initialized
  if (!agencyService.initialized()) {
    // Wait for initialization
    await new Promise<void>(resolve => {
      const check = setInterval(() => {
        if (agencyService.initialized()) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  const user = agencyService.currentUser();
  const path = route.routeConfig?.path;

  // If going to login
  if (path === 'login') {
    if (user) {
      router.navigate([`/${user.role}`]);
      return false;
    }
    return true;
  }

  // If not logged in
  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  // If trying to access incorrect role dashboard
  if (path && path !== user.role && ['admin', 'manager', 'staff', 'client'].includes(path)) {
    router.navigate([`/${user.role}`]);
    return false;
  }

  return true;
};
