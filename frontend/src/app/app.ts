import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Layout } from './core/layout/layout';

@Component({
  imports: [Layout, RouterOutlet],
  selector: 'app-root',
  template: `<app-layout><router-outlet /></app-layout>`,
})
export class App {}
