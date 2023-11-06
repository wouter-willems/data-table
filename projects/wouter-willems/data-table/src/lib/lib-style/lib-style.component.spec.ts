import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LibStyleComponent } from './lib-style.component';

describe('LibStyleComponent', () => {
  let component: LibStyleComponent;
  let fixture: ComponentFixture<LibStyleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LibStyleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LibStyleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
