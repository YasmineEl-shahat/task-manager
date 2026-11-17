import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';

/**
 * Inline loading spinner component.
 *
 * Shows an accessible Material progress spinner with an optional customizable label.
 */
@Component({
  selector: 'app-loading-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
})
export class LoadingSpinnerComponent {
  readonly label = input<string>('Loading…');
  readonly diameter = input<number>(48);
}
