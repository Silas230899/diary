import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewEntryPage } from './new-entry.page';

describe('NewEntryPage', () => {
  let component: NewEntryPage;
  let fixture: ComponentFixture<NewEntryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NewEntryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
