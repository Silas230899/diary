import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

interface MonthCarouselItem {
  key: string;
  month: number;
  label: string;
}

const DEFAULT_FORMATTER_LOCALE = 'default';

@Component({
  selector: 'app-custom-datetime-month-carousel',
  templateUrl: './custom-datetime-month-carousel.component.html',
  styleUrls: ['./custom-datetime-month-carousel.component.css'],
  standalone: true,
  imports: [
    CommonModule,
  ],
})
export class CustomDatetimeMonthCarouselComponent implements AfterViewInit, OnChanges {
  @ViewChild('monthCarousel') monthCarousel?: ElementRef<HTMLElement>;

  @Input() month = 1;
  @Input() selectedMonth: number | null = null;
  @Input() locale = DEFAULT_FORMATTER_LOCALE;
  @Input() disabled = false;

  @Output() monthChange = new EventEmitter<number>();

  monthCarouselItems: MonthCarouselItem[] = [];
  centeredMonthIndex = -1;

  private readonly monthCarouselCycleCount = 7;
  private readonly monthCarouselMiddleCycle = Math.floor(this.monthCarouselCycleCount / 2);
  private monthCarouselScrollEndTimeout?: ReturnType<typeof setTimeout>;
  private monthCarouselDragStartX = 0;
  private monthCarouselDragStartScrollLeft = 0;
  private monthCarouselDragged = false;
  private isDraggingMonthCarousel = false;
  private pointerDownMonthIndex = -1;
  private suppressNextMonthClick = false;
  private suppressVisibleMonthUpdateOnScroll = false;
  private visibleMonth = 1;
  private viewInitialized = false;
  private emittedMonthPendingInput: number | null = null;

  constructor() {
    this.visibleMonth = this.normalizeMonth(this.month);
    this.rebuildMonthCarousel();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.centerMonth(this.visibleMonth);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['locale']) {
      this.rebuildMonthCarousel();
    }

    if (changes['month']) {
      const normalizedMonth = this.normalizeMonth(this.month);
      const shouldCenter = normalizedMonth !== this.emittedMonthPendingInput;

      this.visibleMonth = normalizedMonth;
      this.emittedMonthPendingInput = null;

      if (this.viewInitialized && shouldCenter) {
        this.centerMonth(this.visibleMonth);
      }
    }

    if (this.viewInitialized && changes['locale'] && !changes['month']) {
      this.centerMonth(this.visibleMonth);
    }
  }

  centerMonth(month: number, smooth = false): void {
    this.visibleMonth = this.normalizeMonth(month);

    window.setTimeout(() => {
      const carousel = this.monthCarousel?.nativeElement;

      if (!carousel) {
        return;
      }

      const targetIndex = this.indexForMiddleCycleMonth(month);
      const target = carousel.children.item(targetIndex) as HTMLElement | null;

      if (!target) {
        return;
      }

      this.centeredMonthIndex = targetIndex;
      this.scrollMonthToCenter(target, smooth, false);
    });
  }

  selectMonthByIndex(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.suppressNextMonthClick) {
      this.suppressNextMonthClick = false;
      return;
    }

    this.showMonthIndex(index, true);
  }

  onMonthCarouselScroll(): void {
    const carousel = this.monthCarousel?.nativeElement;

    if (!carousel) {
      return;
    }

    const beforeRecenterMonth = this.getClosestMonthIndexToCenter(carousel);

    this.recenterMonthCarouselIfNeeded(carousel);

    const centeredIndex = this.getClosestMonthIndexToCenter(carousel);

    if (beforeRecenterMonth !== centeredIndex) {
      this.centerMonth(this.visibleMonth);
    }

    if (centeredIndex >= 0) {
      this.centeredMonthIndex = centeredIndex;
    }

    if (!this.suppressVisibleMonthUpdateOnScroll) {
      this.updateVisibleMonthFromCenter(false);
    }

    window.clearTimeout(this.monthCarouselScrollEndTimeout);
    this.monthCarouselScrollEndTimeout = window.setTimeout(() => this.snapMonthCarouselToCenter(), 160);
  }

  onMonthCarouselWheel(event: WheelEvent): void {
    const carousel = this.monthCarousel?.nativeElement;

    if (!carousel) {
      return;
    }

    event.preventDefault();
    carousel.scrollLeft += event.deltaX + event.deltaY;
  }

  onMonthCarouselPointerDown(event: PointerEvent): void {
    const carousel = this.monthCarousel?.nativeElement;

    if (!carousel || this.disabled) {
      return;
    }

    this.isDraggingMonthCarousel = true;
    this.monthCarouselDragged = false;
    this.monthCarouselDragStartX = event.clientX;
    this.monthCarouselDragStartScrollLeft = carousel.scrollLeft;
    this.pointerDownMonthIndex = this.getMonthIndexFromEvent(event);
    carousel.setPointerCapture(event.pointerId);
  }

  onMonthCarouselPointerMove(event: PointerEvent): void {
    const carousel = this.monthCarousel?.nativeElement;

    if (!carousel || !this.isDraggingMonthCarousel) {
      return;
    }

    const delta = event.clientX - this.monthCarouselDragStartX;

    if (Math.abs(delta) > 4) {
      this.monthCarouselDragged = true;
    }

    carousel.scrollLeft = this.monthCarouselDragStartScrollLeft - delta;
  }

  onMonthCarouselPointerUp(event: PointerEvent): void {
    const carousel = this.monthCarousel?.nativeElement;

    if (!carousel || !this.isDraggingMonthCarousel) {
      return;
    }

    this.isDraggingMonthCarousel = false;

    if (carousel.hasPointerCapture(event.pointerId)) {
      carousel.releasePointerCapture(event.pointerId);
    }

    if (!this.monthCarouselDragged && this.pointerDownMonthIndex >= 0) {
      this.showMonthIndex(this.pointerDownMonthIndex, true);
      return;
    }

    if (this.monthCarouselDragged) {
      this.suppressNextMonthClick = true;
    }

    window.clearTimeout(this.monthCarouselScrollEndTimeout);
    this.monthCarouselScrollEndTimeout = window.setTimeout(() => this.snapMonthCarouselToCenter(), 80);
  }

  private recenterMonthCarouselIfNeeded(carousel: HTMLElement): void {
    const cycleWidth = carousel.scrollWidth / this.monthCarouselCycleCount;
    const minScrollLeft = cycleWidth * (this.monthCarouselMiddleCycle - 1);
    const maxScrollLeft = cycleWidth * (this.monthCarouselMiddleCycle + 1);

    if (carousel.scrollLeft < minScrollLeft) {
      carousel.scrollLeft += cycleWidth;
      return;
    }

    if (carousel.scrollLeft > maxScrollLeft) {
      carousel.scrollLeft -= cycleWidth;
    }
  }

  private snapMonthCarouselToCenter(): void {
    const carousel = this.monthCarousel?.nativeElement;

    if (!carousel || this.isDraggingMonthCarousel) {
      return;
    }

    const closestIndex = this.getClosestMonthIndexToCenter(carousel);

    if (closestIndex < 0) {
      return;
    }

    this.showMonthIndex(closestIndex, true);
  }

  private updateVisibleMonthFromCenter(center: boolean): void {
    const carousel = this.monthCarousel?.nativeElement;

    if (!carousel) {
      return;
    }

    const closestIndex = this.getClosestMonthIndexToCenter(carousel);
    const item = closestIndex >= 0 ? this.monthCarouselItems[closestIndex] : undefined;

    if (!item) {
      return;
    }

    this.centeredMonthIndex = closestIndex;

    if (item.month === this.visibleMonth) {
      return;
    }

    this.showMonthIndex(closestIndex, center);
  }

  private getClosestMonthIndexToCenter(carousel: HTMLElement): number {
    const center = carousel.scrollLeft + carousel.clientWidth / 2;
    let closestIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    Array.from(carousel.children).forEach((child, index) => {
      const item = child as HTMLElement;
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.abs(itemCenter - center);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  private showMonthIndex(index: number, center: boolean): void {
    const item = this.monthCarouselItems[index];

    if (!item) {
      return;
    }

    this.centeredMonthIndex = index;
    this.setVisibleMonth(item.month);

    if (center) {
      this.centerMonthIndex(index, true);
    }
  }

  private setVisibleMonth(month: number): void {
    const normalizedMonth = this.normalizeMonth(month);

    if (this.visibleMonth === normalizedMonth) {
      return;
    }

    this.visibleMonth = normalizedMonth;
    this.emittedMonthPendingInput = normalizedMonth;
    this.monthChange.emit(normalizedMonth);
  }

  private centerMonthIndex(index: number, smooth = false): void {
    window.setTimeout(() => {
      const carousel = this.monthCarousel?.nativeElement;
      const target = carousel?.children.item(index) as HTMLElement | null;

      if (!carousel || !target) {
        return;
      }

      this.centeredMonthIndex = index;
      this.scrollMonthToCenter(target, smooth, false);
    });
  }

  private scrollMonthToCenter(target: HTMLElement, smooth: boolean, updateVisibleMonthOnScroll: boolean): void {
    const carousel = this.monthCarousel?.nativeElement;

    if (!carousel) {
      return;
    }

    const carouselRect = carousel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const centerDelta = targetRect.left + targetRect.width / 2 - (carouselRect.left + carouselRect.width / 2);

    this.suppressVisibleMonthUpdateOnScroll = !updateVisibleMonthOnScroll;
    window.setTimeout(() => {
      this.suppressVisibleMonthUpdateOnScroll = false;
    }, smooth ? 350 : 50);

    carousel.scrollTo({
      left: carousel.scrollLeft + centerDelta,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  private getMonthIndexFromEvent(event: Event): number {
    const target = (event.target as HTMLElement).closest<HTMLElement>('.month-item');
    const index = Number(target?.dataset['monthIndex']);

    return Number.isInteger(index) ? index : -1;
  }

  private rebuildMonthCarousel(): void {
    this.monthCarouselItems = Array.from({ length: this.monthCarouselCycleCount * 12 }, (_, index) => {
      const month = (index % 12) + 1;

      return {
        key: `${index}-${month}`,
        month,
        label: new Intl.DateTimeFormat(this.normalizedLocale, { month: 'long' }).format(this.dateFor(month, 1)),
      };
    });
  }

  private indexForMiddleCycleMonth(month: number): number {
    return this.monthCarouselMiddleCycle * 12 + this.normalizeMonth(month) - 1;
  }

  private normalizeMonth(month: number): number {
    return ((month - 1 + 12) % 12) + 1;
  }

  private dateFor(month: number, day: number): Date {
    return new Date(Date.UTC(2024, month - 1, day));
  }

  private get normalizedLocale(): string | undefined {
    return this.locale === DEFAULT_FORMATTER_LOCALE ? undefined : this.locale;
  }
}
