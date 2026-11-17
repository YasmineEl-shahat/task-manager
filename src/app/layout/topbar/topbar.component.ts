import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '@app/core/i18n/i18n.service';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';

/**
 * TopBar Header Component.
 * Contains global search and user notifications matching the Figma design.
 */
@Component({
  selector: 'app-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  readonly i18n = inject(I18nService);
  readonly searchQuery = input<string>('');
  readonly searchChange = output<string>();

  /** Number of activities to display in the notification badge. */
  readonly activityCount = input<number>(0);

  /** Emitted when the notification button is clicked. */
  readonly notificationClick = output<void>();

  protected onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchChange.emit(input.value);
  }
}
