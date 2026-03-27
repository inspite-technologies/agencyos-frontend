import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AgencyService } from './services/agency.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  agencyService = inject(AgencyService);
  protected readonly title = signal('agency-frontend');
}
