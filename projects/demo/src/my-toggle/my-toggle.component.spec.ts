import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyToggleComponent } from './my-toggle.component';

describe('MyToggleComponent', () => {
  let component: MyToggleComponent;
  let fixture: ComponentFixture<MyToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MyToggleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
