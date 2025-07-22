import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpecificDayPage } from './specific-day.page';

describe('SpecificDayPage', () => {
  let component: SpecificDayPage;
  let fixture: ComponentFixture<SpecificDayPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SpecificDayPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
