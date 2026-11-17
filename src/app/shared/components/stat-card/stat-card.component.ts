import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';

export type TrendDirection = 'positive' | 'negative' | 'neutral';

/**
 * Shared Stat Card Component.
 * Displays metric totals, contextual icons, and trend indicators matching Figma tokens.
 */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, TranslatePipe],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input<string>();
  readonly iconClass = input<string>('');
  readonly trend = input<string>();
  readonly trendType = input<TrendDirection>('neutral');
  readonly trendIcon = input<string>();
}
