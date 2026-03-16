import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { Item } from '../models/item.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Users
  getUsers() {
    return this.http.get<User[]>(`${environment.apiUsers}/api/users`);
  }

  getUser(id: number) {
    return this.http.get<User>(`${environment.apiUsers}/api/users/${id}`);
  }

  deleteUser(id: number) {
    return this.http.delete<void>(`${environment.apiUsers}/api/users/${id}`);
  }

  // Items
  getItems() {
    return this.http.get<Item[]>(`${environment.apiItems}/api/items`);
  }

  getItem(id: number) {
    return this.http.get<Item>(`${environment.apiItems}/api/items/${id}`);
  }

  createItem(item: Omit<Item, 'id'>) {
    return this.http.post<Item>(`${environment.apiItems}/api/items`, item);
  }

  deleteItem(id: number) {
    return this.http.delete<void>(`${environment.apiItems}/api/items/${id}`);
  }

  // Profile
  getProfile() {
    return this.http.get<User>(`${environment.apiProfile}/api/profile`);
  }
}
