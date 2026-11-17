import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  const testData: ConfirmDialogData = {
    title: 'Delete Task?',
    message: 'Are you sure you want to delete this task?',
    confirmText: 'Yes, Delete',
    cancelText: 'No, Keep',
    confirmColor: 'warn',
  };

  beforeEach(() => {
    dialogRefSpy = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: testData },
      ],
    });

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders custom title and message from dialog data', () => {
    const title = fixture.debugElement.query(By.css('[mat-dialog-title]'));
    const message = fixture.debugElement.query(By.css('mat-dialog-content p'));

    expect(title.nativeElement.textContent).toContain('Delete Task?');
    expect(message.nativeElement.textContent).toContain(
      'Are you sure you want to delete this task?',
    );
  });

  it('closes dialog with true on confirm', () => {
    component.onConfirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('closes dialog with false on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
