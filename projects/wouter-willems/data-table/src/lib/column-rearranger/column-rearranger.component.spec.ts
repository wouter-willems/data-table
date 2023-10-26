import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColumnRearrangerComponent } from './column-rearranger.component';

describe('ColumnRearrangerComponent', () => {
  let component: ColumnRearrangerComponent;
  let fixture: ComponentFixture<ColumnRearrangerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ColumnRearrangerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColumnRearrangerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
