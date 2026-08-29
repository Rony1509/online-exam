import { Component, inject, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private title = inject(Title);
  private meta = inject(Meta);
  auth = inject(AuthService);

  readonly highlights = [
    'SSC, HSC, and Admission streams',
    'Chapter-wise and full-subject exams',
    'Timed MCQ and CQ assessments',
    'Performance tracking and result review',
  ];

  ngOnInit(): void {
    this.title.setTitle('Questify | Online Exam Platform for SSC, HSC & Admission');

    this.meta.updateTag(
      {
        name: 'description',
        content:
          'Questify is an online exam preparation platform for SSC, HSC, and Admission students. Practice chapter-wise, take model tests, and review results in one smart learning system.',
      },
      'name="description"',
    );

    this.meta.updateTag(
      {
        name: 'keywords',
        content:
          'online exam platform, SSC exam preparation, HSC exam preparation, admission exam, model tests, chapter-wise exams, MCQ quiz, result tracking',
      },
      'name="keywords"',
    );

    this.meta.updateTag(
      {
        property: 'og:title',
        content: 'Questify | Online Exam Platform for SSC, HSC & Admission',
      },
      'property="og:title"',
    );

    this.meta.updateTag(
      {
        property: 'og:description',
        content:
          'Practice chapter-wise, take timed mock exams, and monitor progress with Questify — the smart online exam platform for SSC, HSC, and Admission students.',
      },
      'property="og:description"',
    );

    this.meta.updateTag(
      {
        property: 'og:url',
        content: 'https://rony1509.github.io/online-exam/',
      },
      'property="og:url"',
    );
  }
}
