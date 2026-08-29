import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Role, User } from '../../../core/models/models';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-list.html',
})
export class UserList {
  readonly auth = inject(AuthService);
  private userService = inject(UserService);

  users = signal<User[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  readonly roles: Role[] = ['student', 'teacher', 'admin'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.userService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load users — check your connection and try again.');
        this.loading.set(false);
      },
    });
  }

  isSelf(user: User): boolean {
    return user.id === this.auth.currentUser()?.id;
  }

  changeRole(user: User, role: Role): void {
    if (role === user.role) return;
    this.userService.setRole(user.id, role).subscribe({
      next: () => this.users.update((list) => list.map((u) => (u.id === user.id ? { ...u, role } : u))),
      error: (err) => alert(err.message || 'Could not update this user\'s role.'),
    });
  }

  remove(user: User): void {
    if (this.isSelf(user)) return;
    if (!confirm(`Remove ${user.name} (${user.email})? They will lose access to the app immediately.`)) return;
    this.userService.remove(user.id).subscribe({
      next: () => this.users.update((list) => list.filter((u) => u.id !== user.id)),
      error: (err) => alert(err.message || 'Could not remove this user.'),
    });
  }
}
