// roster.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RosterComponent } from './roster.component';
import { ROSTER_ROUTES } from './roster.routes';

@NgModule({
  declarations: [RosterComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(ROSTER_ROUTES), // Make sure to import RouterModule with the child routes
  ],
})
export class RosterModule {}
