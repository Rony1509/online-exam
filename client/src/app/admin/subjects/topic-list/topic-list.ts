import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChapterService } from '../../../core/services/chapter.service';
import { SubjectService } from '../../../core/services/subject.service';
import { TopicService } from '../../../core/services/topic.service';
import { Chapter, Subject, Topic } from '../../../core/models/models';

@Component({
  selector: 'app-topic-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './topic-list.html',
})
export class TopicList {
  private route = inject(ActivatedRoute);
  private chapterService = inject(ChapterService);
  private subjectService = inject(SubjectService);
  private topicService = inject(TopicService);

  subjectId = '';
  chapterId = '';
  subject = signal<Subject | null>(null);
  chapter = signal<Chapter | null>(null);
  topics = signal<Topic[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  newTopicName = '';
  adding = signal(false);
  editingId: string | null = null;
  editingName = '';

  ngOnInit(): void {
    this.subjectId = this.route.snapshot.paramMap.get('subjectId') ?? '';
    this.chapterId = this.route.snapshot.paramMap.get('chapterId') ?? '';

    this.subjectService.list().subscribe((subjects) => {
      this.subject.set(subjects.find((s) => s.id === this.subjectId) ?? null);
    });
    this.chapterService.list({ subjectId: this.subjectId }).subscribe((chapters) => {
      this.chapter.set(chapters.find((c) => c.id === this.chapterId) ?? null);
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.topicService.list({ subjectId: this.subjectId, chapterId: this.chapterId }).subscribe({
      next: (topics) => {
        this.topics.set(topics);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  add(): void {
    const name = this.newTopicName.trim();
    if (!name) return;
    this.adding.set(true);
    this.topicService.create({ subjectId: this.subjectId, chapterId: this.chapterId, name }).subscribe({
      next: () => {
        this.newTopicName = '';
        this.adding.set(false);
        this.load();
      },
      error: (err) => {
        this.adding.set(false);
        this.errorMessage.set(err.message || 'Could not add topic.');
      },
    });
  }

  startEdit(topic: Topic): void {
    this.editingId = topic.id;
    this.editingName = topic.name;
  }

  cancelEdit(): void {
    this.editingId = null;
  }

  saveEdit(topic: Topic): void {
    const name = this.editingName.trim();
    if (!name) return;
    this.topicService.update(topic.id, { subjectId: this.subjectId, chapterId: this.chapterId, name }).subscribe({
      next: () => {
        this.editingId = null;
        this.load();
      },
      error: (err) => this.errorMessage.set(err.message || 'Could not update topic.'),
    });
  }

  remove(topic: Topic): void {
    if (!confirm(`Delete topic "${topic.name}"?`)) return;
    this.topicService.delete(topic.id).subscribe({
      next: () => this.load(),
      error: (err) => alert(err.message || 'Could not delete topic.'),
    });
  }

  isPublished(topic: Topic): boolean {
    return topic.isPublished !== false;
  }

  togglePublish(topic: Topic): void {
    const next = !this.isPublished(topic);
    this.topicService.setPublished(topic.id, next).subscribe({
      next: () => this.topics.update((list) => list.map((t) => (t.id === topic.id ? { ...t, isPublished: next } : t))),
      error: (err) => alert(err.message || 'Could not update publish status.'),
    });
  }
}
