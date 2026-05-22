import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CustomDatetimeComponent } from './custom-datetime.component';

describe('CustomDatetimeComponent', () => {
  let component: CustomDatetimeComponent;
  let fixture: ComponentFixture<CustomDatetimeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), CustomDatetimeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomDatetimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
