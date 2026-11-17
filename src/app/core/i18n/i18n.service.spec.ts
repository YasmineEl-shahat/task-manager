import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let i18n: I18nService;

  beforeEach(() => {
    localStorage.removeItem('task-manager-language');
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
  });

  afterEach(() => {
    i18n.setLanguage('en');
    localStorage.removeItem('task-manager-language');
  });

  it('starts in English by default', () => {
    expect(i18n.language()).toBe('en');
    expect(i18n.direction()).toBe('ltr');
  });

  it('switches to Arabic, updates document direction, and remembers the selection', () => {
    i18n.setLanguage('ar');

    expect(i18n.language()).toBe('ar');
    expect(i18n.direction()).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem('task-manager-language')).toBe('ar');
  });

  it('translates labels and interpolates dynamic values', () => {
    i18n.setLanguage('ar');

    expect(i18n.translate('Dashboard')).toBe('لوحة المعلومات');
    expect(i18n.translate('Task options for {title}', { title: 'Review' })).toBe(
      'خيارات المهمة Review',
    );
  });

  it('toggles between supported languages', () => {
    i18n.toggleLanguage();
    expect(i18n.language()).toBe('ar');

    i18n.toggleLanguage();
    expect(i18n.language()).toBe('en');
  });
});
