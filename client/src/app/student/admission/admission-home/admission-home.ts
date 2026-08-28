import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdmissionCategory } from '../../../core/models/models';

@Component({
  selector: 'app-admission-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admission-home.html',
})
export class AdmissionHome {
  readonly categories: { key: AdmissionCategory; label: string; description: string }[] = [
    {
      key: 'Medical',
      label: 'Medical',
      description: 'Practice exams for medical college admission tests.',
    },
    {
      key: 'Engineering',
      label: 'Engineering',
      description: 'Practice exams for engineering university admission tests.',
    },
    {
      key: 'Varsity',
      label: 'Varsity',
      description: 'Practice exams for general public university admission tests.',
    },
  ];
}
