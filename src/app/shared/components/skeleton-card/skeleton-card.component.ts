import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';

/**
 * Animated placeholder card shown while content is loading.
 *
 * Renders `count` shimmer-effect cards to prevent layout shift during data fetch.
 */
@Component({
  selector: 'app-skeleton-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './skeleton-card.component.html',
  styleUrl: './skeleton-card.component.scss',
})
export class SkeletonCardComponent {
  readonly count = input<number>(3);

  protected readonly columns = computed(() => {
    const columns = [
      { title: 'TO DO', items: [] as number[] },
      { title: 'IN PROGRESS', items: [] as number[] },
      { title: 'DONE', items: [] as number[] },
    ];

    for (let item = 0; item < this.count(); item++) {
      columns[item % columns.length]!.items.push(item);
    }

    return columns;
  });
}
