import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  profileError = signal<string | null>(null);
  profile = signal<{ username: string; email: string; role: string } | null>(null);

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.api.getProfile().subscribe({
        next: p => this.profile.set(p),
        error: () => this.profileError.set('Failed to load profile.')
      });
    }
  }
}
