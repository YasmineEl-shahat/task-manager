import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';

/**
 * Dismissible error banner with an optional Retry action.
 *
 * Presentational (dumb) component.
 */
@Component({
  selector: 'app-error-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './error-banner.component.html',
  styleUrl: './error-banner.component.scss',
})
export class ErrorBannerComponent {
  readonly message = input<string>('An error occurred. Please try again.');
  readonly retrying = input<boolean>(false);
  readonly showRetry = input<boolean>(true);

  readonly retry = output<void>();
  readonly dismiss = output<void>();
}
