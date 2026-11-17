import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(
    key: string | null | undefined,
    params: Readonly<Record<string, string | number>> = {},
  ): string {
    return key ? this.i18n.translate(key, params) : '';
  }
}
