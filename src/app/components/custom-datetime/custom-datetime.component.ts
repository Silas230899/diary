import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  IonButton,
  IonModal,
} from '@ionic/angular/standalone';

export interface CustomDatetimeValue {
  month: number;
  day: number;
}

export type CustomDatetimeModel = CustomDatetimeValue | string | null | undefined;

interface CalendarDay extends CustomDatetimeValue {
  label: number;
  adjacent: boolean;
  today: boolean;
  selected: boolean;
}

interface MonthCarouselItem {
  key: string;
  month: number;
  label: string;
}

const MONTH_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DEFAULT_FORMATTER_LOCALE = 'default';

@Component({
  selector: 'app-custom-datetime',
  templateUrl: './custom-datetime.component.html',
  styleUrls: ['./custom-datetime.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonModal,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDatetimeComponent),
      multi: true,
    },
  ],
})
export class CustomDatetimeComponent implements AfterViewInit, ControlValueAccessor, OnChanges {
  @ViewChild('monthCarousel') monthCarousel?: ElementRef<HTMLElement>;

  @Input() value: CustomDatetimeModel = null;
  @Input() locale = DEFAULT_FORMATTER_LOCALE;
  @Input() firstDayOfWeek = 0;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() button = false;
  @Input() placeholder = 'Select date';
  @Input() doneText = 'Done';
  @Input() cancelText = 'Cancel';
  @Input() clearText = 'Clear';
  @Input() showDefaultButtons = false;
  @Input() showClearButton = false;
  @Input() showAdjacentDays = true;
  @Input() color = 'primary';
  @Input() valueFormat: 'object' | 'string' = 'object';

  @Output() valueChange = new EventEmitter<CustomDatetimeValue | string | null>();
  @Output() ionChange = new EventEmitter<{ value: CustomDatetimeValue | string | null }>();
  @Output() ionCancel = new EventEmitter<void>();

  selectedDate: CustomDatetimeValue | null = null;
  workingDate: CustomDatetimeValue;
  visibleMonth: number;
  calendarDays: CalendarDay[] = [];
  calendarPreviousDays: CalendarDay[] = [];
  calendarCurrentDays: CalendarDay[] = [];
  calendarNextDays: CalendarDay[] = [];
  calendarTransitionActive = false;
  calendarTransitionDirection: 'forward' | 'backward' = 'forward';
  calendarTrackPosition: 'left' | 'center' | 'right' = 'center';
  calendarTrackTransition = false;
  monthCarouselItems: MonthCarouselItem[] = [];
  centeredMonthIndex = -1;
  visuallySelectedMonth: number | null = null;
  weekdayLabels: string[] = [];
  isPopoverOpen = false;

  private onTouched: () => void = () => undefined;
  private onChange: (value: CustomDatetimeValue | string | null) => void = () => undefined;
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
  private calendarTransitionTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    const today = this.getToday();
    this.workingDate = today;
    this.visibleMonth = today.month;
    this.rebuildMonthCarousel();
    this.rebuildWeekdayLabels();
    this.rebuildCalendar();
  }

  ngAfterViewInit(): void {
    this.centerVisibleMonth();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['locale'] || changes['firstDayOfWeek']) {
      this.syncFromValue(this.value);
    }

    if (changes['locale'] || changes['firstDayOfWeek']) {
      this.rebuildWeekdayLabels();
    }

    if (changes['locale']) {
      this.rebuildMonthCarousel();
      this.centerVisibleMonth();
    }
  }

  writeValue(value: CustomDatetimeModel): void {
    this.value = value;
    this.syncFromValue(value);
  }

  registerOnChange(fn: (value: CustomDatetimeValue | string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  open(event?: Event): void {
    if (this.disabled) {
      return;
    }

    if (event) {
      event.stopPropagation();
    }

    this.workingDate = this.selectedDate ?? this.getToday();
    this.visibleMonth = this.workingDate.month;
    this.visuallySelectedMonth = this.selectedDate?.month ?? null;
    this.rebuildCalendar();
    this.isPopoverOpen = true;
    this.centerVisibleMonthAfterOpen();
  }

  close(): void {
    this.isPopoverOpen = false;
    this.onTouched();
  }

  previousMonth(): void {
    this.setVisibleMonth(this.visibleMonth === 1 ? 12 : this.visibleMonth - 1, true);
  }

  nextMonth(): void {
    this.setVisibleMonth(this.visibleMonth === 12 ? 1 : this.visibleMonth + 1, true);
  }

  selectMonthByIndex(index: number, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.suppressNextMonthClick) {
      this.suppressNextMonthClick = false;
      return;
    }

    this.selectMonthIndex(index, true);
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
      this.centerVisibleMonth(false, false);
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
      this.selectMonthIndex(this.pointerDownMonthIndex, true);
      return;
    }

    if (this.monthCarouselDragged) {
      this.suppressNextMonthClick = true;
    }

    window.clearTimeout(this.monthCarouselScrollEndTimeout);
    this.monthCarouselScrollEndTimeout = window.setTimeout(() => this.snapMonthCarouselToCenter(), 80);
  }

  selectDay(day: CalendarDay): void {
    if (this.disabled || this.readonly || !this.shouldShowCalendarDay(day)) {
      return;
    }

    this.workingDate = { month: day.month, day: day.day };
    this.visuallySelectedMonth = day.month;
    this.setVisibleMonth(day.month, true);
    this.showMonth(day.month, true);

    if (!this.showDefaultButtons) {
      this.commit(this.button);
    }
  }

  confirm(closeOverlay = false): void {
    this.commit(closeOverlay);
  }

  cancel(closeOverlay = false): void {
    this.workingDate = this.selectedDate ?? this.getToday();
    this.setVisibleMonth(this.workingDate.month, false);
    this.ionCancel.emit();

    if (closeOverlay) {
      this.close();
    }
  }

  clear(closeOverlay = false): void {
    if (this.disabled || this.readonly) {
      return;
    }

    this.selectedDate = null;
    this.visuallySelectedMonth = null;
    this.emitValue(null);

    if (closeOverlay) {
      this.close();
    }
  }

  reset(value?: CustomDatetimeModel): void {
    this.syncFromValue(value ?? null);
  }

  get monthLabel(): string {
    return new Intl.DateTimeFormat(this.normalizedLocale, { month: 'long' }).format(this.dateFor(this.visibleMonth, 1));
  }

  get buttonText(): string {
    return this.selectedDate ? this.formatDate(this.selectedDate) : this.placeholder;
  }

  trackByDate(_: number, day: CalendarDay): string {
    return `${day.month}-${day.day}-${day.adjacent}`;
  }

  shouldShowCalendarDay(day: CalendarDay): boolean {
    return this.showAdjacentDays || !day.adjacent;
  }

  isCalendarDayDisabled(day: CalendarDay): boolean {
    return this.disabled || !this.shouldShowCalendarDay(day);
  }

  private syncFromValue(value: CustomDatetimeModel): void {
    const parsed = this.parseValue(value);
    this.selectedDate = parsed;
    this.workingDate = parsed ?? this.getToday();
    this.visibleMonth = this.workingDate.month;
    this.visuallySelectedMonth = parsed?.month ?? null;
    this.rebuildWeekdayLabels();
    this.rebuildCalendar();
    this.centerVisibleMonth(false, parsed !== null);
  }

  private commit(closeOverlay: boolean): void {
    this.selectedDate = { ...this.workingDate };
    this.emitValue(this.selectedDate);

    if (closeOverlay) {
      this.close();
    }
  }

  private emitValue(value: CustomDatetimeValue | null): void {
    const emitted = value === null ? null : this.formatOutputValue(value);
    this.value = emitted;
    this.valueChange.emit(emitted);
    this.ionChange.emit({ value: emitted });
    this.onChange(emitted);
    this.onTouched();
    this.rebuildCalendar();
  }

  private formatOutputValue(value: CustomDatetimeValue): CustomDatetimeValue | string {
    if (this.valueFormat === 'string') {
      return this.toMonthDayString(value);
    }

    return { ...value };
  }

  private parseValue(value: CustomDatetimeModel): CustomDatetimeValue | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'string') {
      const match = value.match(/^(\d{1,2})-(\d{1,2})$/);

      if (!match) {
        return null;
      }

      return this.normalizeDate(Number(match[1]), Number(match[2]));
    }

    return this.normalizeDate(value.month, value.day);
  }

  private normalizeDate(month: number, day: number): CustomDatetimeValue | null {
    if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12) {
      return null;
    }

    const maxDay = MONTH_LENGTHS[month - 1];

    if (day < 1 || day > maxDay) {
      return null;
    }

    return { month, day };
  }

  private rebuildCalendar(): void {
    this.calendarDays = this.createCalendarDays(this.visibleMonth);

    if (!this.calendarTransitionActive) {
      this.rebuildCalendarPages(this.visibleMonth);
    }
  }

  private createCalendarDays(month: number): CalendarDay[] {
    const days: CalendarDay[] = [];
    const firstWeekday = this.weekdayFor(month, 1);
    const leadingDays = (firstWeekday - this.firstDayOfWeek + 7) % 7;
    const previousMonth = this.previousCycleMonth(month);
    const nextMonth = this.nextCycleMonth(month);
    const previousMonthLength = MONTH_LENGTHS[previousMonth - 1];
    const monthLength = MONTH_LENGTHS[month - 1];

    for (let i = leadingDays - 1; i >= 0; i--) {
      days.push(this.createCalendarDay(previousMonth, previousMonthLength - i, true));
    }

    for (let day = 1; day <= monthLength; day++) {
      days.push(this.createCalendarDay(month, day, false));
    }

    while (days.length % 7 !== 0 || days.length < 42) {
      const day = days.length - leadingDays - monthLength + 1;
      days.push(this.createCalendarDay(nextMonth, day, true));
    }

    return days;
  }

  private rebuildCalendarPages(month: number): void {
    this.calendarPreviousDays = this.createCalendarDays(this.previousCycleMonth(month));
    this.calendarCurrentDays = this.createCalendarDays(month);
    this.calendarNextDays = this.createCalendarDays(this.nextCycleMonth(month));
    this.calendarTrackPosition = 'center';
    this.calendarTrackTransition = false;
  }

  private setVisibleMonth(month: number, animate: boolean): void {
    const normalizedMonth = this.normalizeMonth(month);

    if (this.visibleMonth === normalizedMonth) {
      return;
    }

    const previousMonth = this.visibleMonth;
    const direction = this.getMonthTransitionDirection(previousMonth, normalizedMonth);
    window.clearTimeout(this.calendarTransitionTimeout);

    if (animate && this.calendarCurrentDays.length > 0) {
      this.calendarTransitionDirection = direction;
      this.calendarTransitionActive = true;
      this.calendarTrackTransition = false;
      this.calendarTrackPosition = 'center';
      this.calendarPreviousDays = direction === 'backward'
        ? this.createCalendarDays(normalizedMonth)
        : this.createCalendarDays(this.previousCycleMonth(previousMonth));
      this.calendarCurrentDays = this.createCalendarDays(previousMonth);
      this.calendarNextDays = direction === 'forward'
        ? this.createCalendarDays(normalizedMonth)
        : this.createCalendarDays(this.nextCycleMonth(previousMonth));
      this.visibleMonth = normalizedMonth;
      this.calendarDays = this.createCalendarDays(normalizedMonth);

      window.requestAnimationFrame(() => {
        this.calendarTrackTransition = true;
        this.calendarTrackPosition = direction === 'forward' ? 'right' : 'left';
      });

      this.calendarTransitionTimeout = window.setTimeout(() => {
        this.calendarTransitionActive = false;
        this.rebuildCalendarPages(this.visibleMonth);
      }, 240);
    } else {
      this.calendarTransitionActive = false;
      this.calendarTrackTransition = false;
      this.visibleMonth = normalizedMonth;
      this.rebuildCalendar();
    }
  }

  private normalizeMonth(month: number): number {
    return ((month - 1 + 12) % 12) + 1;
  }

  private previousCycleMonth(month: number): number {
    return month === 1 ? 12 : month - 1;
  }

  private nextCycleMonth(month: number): number {
    return month === 12 ? 1 : month + 1;
  }

  private getMonthTransitionDirection(fromMonth: number, toMonth: number): 'forward' | 'backward' {
    const forwardDistance = (toMonth - fromMonth + 12) % 12;
    const backwardDistance = (fromMonth - toMonth + 12) % 12;

    return forwardDistance <= backwardDistance ? 'forward' : 'backward';
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

  private rebuildWeekdayLabels(): void {
    this.weekdayLabels = Array.from({ length: 7 }, (_, index) => {
      const weekday = (this.firstDayOfWeek + index) % 7;
      const date = new Date(Date.UTC(2024, 0, 7 + weekday));
      return new Intl.DateTimeFormat(this.normalizedLocale, { weekday: 'narrow' }).format(date).toLocaleUpperCase(this.normalizedLocale);
    });
  }

  private createCalendarDay(month: number, day: number, adjacent: boolean): CalendarDay {
    const value = { month, day };

    return {
      ...value,
      label: day,
      adjacent,
      today: this.isSameDate(value, this.getToday()),
      selected: this.isSameDate(value, this.workingDate),
    };
  }

  private isSameDate(a: CustomDatetimeValue | null, b: CustomDatetimeValue | null): boolean {
    return a !== null && b !== null && a.month === b.month && a.day === b.day;
  }

  private formatDate(value: CustomDatetimeValue): string {
    return new Intl.DateTimeFormat(this.normalizedLocale, {
      month: 'long',
      day: 'numeric',
    }).format(this.dateFor(value.month, value.day));
  }

  private toMonthDayString(value: CustomDatetimeValue): string {
    return `${value.month.toString().padStart(2, '0')}-${value.day.toString().padStart(2, '0')}`;
  }

  private getToday(): CustomDatetimeValue {
    const today = new Date();
    return { month: today.getMonth() + 1, day: today.getDate() };
  }

  private weekdayFor(month: number, day: number): number {
    return this.dateFor(month, day).getUTCDay();
  }

  private dateFor(month: number, day: number): Date {
    return new Date(Date.UTC(2024, month - 1, day));
  }

  private centerVisibleMonth(smooth = false, updateVisibleMonthOnScroll = false): void {
    window.setTimeout(() => {
      const carousel = this.monthCarousel?.nativeElement;

      if (!carousel) {
        return;
      }

      const targetIndex = this.monthCarouselMiddleCycle * 12 + this.visibleMonth - 1;
      const target = carousel.children.item(targetIndex) as HTMLElement | null;

      if (!target) {
        return;
      }

      this.centeredMonthIndex = targetIndex;
      this.scrollMonthToCenter(target, smooth, updateVisibleMonthOnScroll);
    });
  }

  private centerVisibleMonthAfterOpen(): void {
    window.setTimeout(() => this.centerVisibleMonth(false, false), 0);
    window.setTimeout(() => this.centerVisibleMonth(false, false), 50);
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

  private selectMonthIndex(index: number, center: boolean): void {
    this.showMonthIndex(index, center);
  }

  private showMonthIndex(index: number, center: boolean): void {
    const item = this.monthCarouselItems[index];

    if (!item) {
      return;
    }

    this.centeredMonthIndex = index;
    this.setVisibleMonth(item.month, true);

    if (center) {
      this.centerMonthIndex(index, true);
    }
  }

  private showMonth(month: number, center: boolean): void {
    this.showMonthIndex(this.indexForMiddleCycleMonth(month), center);
  }

  private indexForMiddleCycleMonth(month: number): number {
    return this.monthCarouselMiddleCycle * 12 + month - 1;
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

  private get normalizedLocale(): string | undefined {
    return this.locale === DEFAULT_FORMATTER_LOCALE ? undefined : this.locale;
  }

}
