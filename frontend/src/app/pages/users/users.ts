import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../services/api';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-users',
  imports: [DatePipe],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);

  users = signal<User[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.api.getUsers().subscribe({
      next: data => { this.users.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load users.'); this.loading.set(false); }
    });
  }

  deleteUser(id: number) {
    this.api.deleteUser(id).subscribe({
      next: () => this.users.update(list => list.filter(u => u.id !== id)),
      error: () => this.error.set('Delete failed.')
    });
  }
}
