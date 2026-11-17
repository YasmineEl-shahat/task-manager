import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

/**
 * Animated placeholder card shown while content is loading.
 *
 * Renders `count` shimmer-effect cards to prevent layout shift during data fetch.
 */
@Component({
  selector: 'app-skeleton-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule],
  templateUrl: './skeleton-card.component.html',
  styleUrl: './skeleton-card.component.scss',
})
export class SkeletonCardComponent {
  readonly count = input<number>(3);

  /** Range array used by `@for` to render N skeleton cards. */
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
