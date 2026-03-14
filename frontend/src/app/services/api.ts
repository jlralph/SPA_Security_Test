import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user.model';
import { Item } from '../models/item.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Users
  getUsers() {
    return this.http.get<User[]>('/api/users');
  }

  getUser(id: number) {
    return this.http.get<User>(`/api/users/${id}`);
  }

  deleteUser(id: number) {
    return this.http.delete<void>(`/api/users/${id}`);
  }

  // Items
  getItems() {
    return this.http.get<Item[]>('/api/items');
  }

  getItem(id: number) {
    return this.http.get<Item>(`/api/items/${id}`);
  }

  createItem(item: Omit<Item, 'id'>) {
    return this.http.post<Item>('/api/items', item);
  }

  deleteItem(id: number) {
    return this.http.delete<void>(`/api/items/${id}`);
  }

  // Profile
  getProfile() {
    return this.http.get<User>('/api/profile');
  }
}
