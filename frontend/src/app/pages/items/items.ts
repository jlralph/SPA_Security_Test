import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-items',
  imports: [FormsModule],
  templateUrl: './items.html',
  styleUrl: './items.scss',
})
export class ItemsComponent implements OnInit {
  private readonly api = inject(ApiService);

  items = signal<Item[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);

  newItem: Omit<Item, 'id'> = { name: '', description: '', price: 0, category: '', inStock: true };

  ngOnInit() {
    this.api.getItems().subscribe({
      next: data => { this.items.set(data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load items.'); this.loading.set(false); }
    });
  }

  addItem() {
    this.api.createItem(this.newItem).subscribe({
      next: item => {
        this.items.update(list => [...list, item]);
        this.newItem = { name: '', description: '', price: 0, category: '', inStock: true };
        this.showForm.set(false);
      },
      error: () => this.error.set('Failed to create item.')
    });
  }

  deleteItem(id: number) {
    this.api.deleteItem(id).subscribe({
      next: () => this.items.update(list => list.filter(i => i.id !== id)),
      error: () => this.error.set('Delete failed.')
    });
  }
}
