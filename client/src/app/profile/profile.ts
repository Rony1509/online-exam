import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, firebaseErrorMessage } from '../core/services/auth.service';
import { SectionService } from '../core/services/section.service';
import { colorFor, initialsFor } from '../core/utils/avatar-color';
import { AdmissionCategory, SectionItem } from '../core/models/models';

const ADMISSION_CATEGORIES: AdmissionCategory[] = ['Medical', 'Engineering', 'Varsity'];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.html',
})
export class Profile {
  readonly auth = inject(AuthService);
  private sectionService = inject(SectionService);

  readonly colorFor = colorFor;
  readonly initialsFor = initialsFor;
  readonly admissionCategories = ADMISSION_CATEGORIES;

  editing = signal(false);
  editedName = '';
  saving = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  allSections = signal<SectionItem[]>([]);
  editingSection = signal(false);
  sectionSaving = signal(false);
  editedSection = '';
  editedCategory = '';

  resetSending = signal(false);
  resetSent = signal(false);
  resetError = signal<string | null>(null);

  get joinedOn(): string {
    const createdAt = this.auth.currentUser()?.createdAt;
    if (!createdAt) return '—';
    const date = new Date(createdAt);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  get isEditedAdmission(): boolean {
    return this.editedSection === 'Admission';
  }

  ngOnInit(): void {
    this.sectionService.list().subscribe((sections) => this.allSections.set(sections));
  }

  startEdit(): void {
    this.editedName = this.auth.currentUser()?.name ?? '';
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    const name = this.editedName.trim();
    if (!name) {
      this.errorMessage.set('Name cannot be empty.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.auth.updateProfile({ name }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.successMessage.set('Profile updated.');
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.message || 'Could not update profile.');
      },
    });
  }

  startEditSection(): void {
    this.editedSection = this.auth.currentUser()?.section ?? '';
    this.editedCategory = this.auth.currentUser()?.category ?? '';
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.editingSection.set(true);
  }

  cancelEditSection(): void {
    this.editingSection.set(false);
  }

  saveSection(): void {
    if (!this.editedSection) {
      this.errorMessage.set('Select a section.');
      return;
    }
    if (this.isEditedAdmission && !this.editedCategory) {
      this.errorMessage.set('Select a category for Admission.');
      return;
    }

    this.sectionSaving.set(true);
    this.errorMessage.set(null);
    this.auth
      .updateProfile({
        section: this.editedSection,
        ...(this.isEditedAdmission ? { category: this.editedCategory as AdmissionCategory } : {}),
      })
      .subscribe({
        next: () => {
          this.sectionSaving.set(false);
          this.editingSection.set(false);
          this.successMessage.set('Section updated — exams and the question bank now reflect it.');
        },
        error: (err) => {
          this.sectionSaving.set(false);
          this.errorMessage.set(err.message || 'Could not update section.');
        },
      });
  }

  sendPasswordReset(): void {
    const email = this.auth.currentUser()?.email;
    if (!email) return;

    this.resetSending.set(true);
    this.resetError.set(null);
    this.resetSent.set(false);
    this.auth
      .sendPasswordResetEmail(email)
      .then(() => this.resetSent.set(true))
      .catch((err) => this.resetError.set(firebaseErrorMessage(err, 'Unable to send the reset email right now.')))
      .finally(() => this.resetSending.set(false));
  }
}
