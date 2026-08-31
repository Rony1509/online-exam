import { Injectable } from '@angular/core';
import { collection, deleteDoc, deleteField, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Observable, from } from 'rxjs';
import { db } from '../firebase';
import { Chapter, Subject } from '../models/models';

export interface MigrationSummary {
  chaptersTaggedWithSection: number;
  subjectsMerged: number;
  questionsRepointed: number;
  examsRepointed: number;
  topicsRepointed: number;
  chaptersRepointed: number;
}

/**
 * One-time admin migration from the old "Subject carries a fixed section" model to the new
 * "Subject is section-agnostic, Section lives on Chapter" model. Safe to run more than once —
 * anything already migrated (chapter already has a `section`, subject names already unique) is
 * left alone.
 */
@Injectable({ providedIn: 'root' })
export class MigrationService {
  migrate(): Observable<MigrationSummary> {
    return from(this.migrateAsync());
  }

  private async migrateAsync(): Promise<MigrationSummary> {
    const [subjectsSnap, chaptersSnap] = await Promise.all([
      getDocs(collection(db, 'subjects')),
      getDocs(collection(db, 'chapters')),
    ]);

    const subjects = subjectsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subject, 'id'>) }));
    const chapters = chaptersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Chapter, 'id'>) }));
    const subjectById = new Map(subjects.map((s) => [s.id, s]));

    // Step 1: give every chapter that predates the Section field a section, copied from
    // whatever its (pre-merge) parent subject used to carry.
    let chaptersTaggedWithSection = 0;
    for (const chapter of chapters) {
      if (chapter.section) continue;
      const parent = subjectById.get(chapter.subjectId);
      const section = parent?.section || 'SSC';
      await updateDoc(doc(db, 'chapters', chapter.id), {
        section,
        ...(parent?.category ? { category: parent.category } : {}),
      });
      chaptersTaggedWithSection++;
    }

    // Step 2: merge subjects that share a name (case/space-insensitive) — these used to be
    // separate section-locked entries for the same subject, e.g. "Math" (SSC) and "Math" (HSC).
    const groups = new Map<string, Subject[]>();
    for (const subject of subjects) {
      const key = subject.name.trim().toLowerCase();
      const list = groups.get(key) ?? [];
      list.push(subject);
      groups.set(key, list);
    }

    let subjectsMerged = 0;
    let questionsRepointed = 0;
    let examsRepointed = 0;
    let topicsRepointed = 0;
    let chaptersRepointed = 0;

    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      const [canonical, ...duplicates] = group;

      for (const dup of duplicates) {
        const [chaptersOfDup, topicsOfDup, questionsOfDup, examsOfDup] = await Promise.all([
          getDocs(collection(db, 'chapters')).then((s) => s.docs.filter((d) => d.data()['subjectId'] === dup.id)),
          getDocs(collection(db, 'topics')).then((s) => s.docs.filter((d) => d.data()['subjectId'] === dup.id)),
          getDocs(collection(db, 'questions')).then((s) => s.docs.filter((d) => d.data()['subjectId'] === dup.id)),
          getDocs(collection(db, 'exams')).then((s) => s.docs.filter((d) => d.data()['subjectId'] === dup.id)),
        ]);

        for (const c of chaptersOfDup) {
          await updateDoc(doc(db, 'chapters', c.id), { subjectId: canonical.id });
          chaptersRepointed++;
        }
        for (const t of topicsOfDup) {
          await updateDoc(doc(db, 'topics', t.id), { subjectId: canonical.id });
          topicsRepointed++;
        }
        for (const q of questionsOfDup) {
          await updateDoc(doc(db, 'questions', q.id), { subjectId: canonical.id, subjectName: canonical.name });
          questionsRepointed++;
        }
        for (const e of examsOfDup) {
          await updateDoc(doc(db, 'exams', e.id), { subjectId: canonical.id, subjectName: canonical.name });
          examsRepointed++;
        }

        await deleteDoc(doc(db, 'subjects', dup.id));
        subjectsMerged++;
      }

      // Clean up the legacy fields on the surviving subject now that its chapters carry the section.
      await updateDoc(doc(db, 'subjects', canonical.id), {
        section: deleteField(),
        category: deleteField(),
      });
    }

    // Also strip legacy fields off subjects that had no duplicates to merge, once their
    // chapters have all been tagged.
    for (const subject of subjects) {
      if (groups.get(subject.name.trim().toLowerCase())!.length > 1) continue;
      if (subject.section === undefined && subject.category === undefined) continue;
      await updateDoc(doc(db, 'subjects', subject.id), {
        section: deleteField(),
        category: deleteField(),
      });
    }

    return {
      chaptersTaggedWithSection,
      subjectsMerged,
      questionsRepointed,
      examsRepointed,
      topicsRepointed,
      chaptersRepointed,
    };
  }
}
