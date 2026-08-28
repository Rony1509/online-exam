import { Component, inject, signal } from '@angular/core';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  auth = inject(AuthService);
  private router = inject(Router);

  menuOpen = signal(false);

  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) this.menuOpen.set(false);
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
    this.menuOpen.set(false);
    this.router.navigate(['/login']);
  }
}
