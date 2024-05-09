// roster.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface UserStats {
  username: string;
  profileLink: string;
  articleCount: number;
  favoriteCount: number;
  firstArticleDate: string | null;
}

@Component({
  selector: 'realworld-roster',
  templateUrl: './roster.component.html',
  styleUrls: [],
  providers: [],
  imports: [CommonModule, HttpClientModule], // Import CommonModule and HttpClientModule here
  standalone: true, // Declare the component as standalone
})

export class RosterComponent implements OnInit {
  userStats: UserStats[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<UserStats[]>('/api/user/roster').subscribe({
      next: (data) => {
        this.userStats = data;
      },
      error: (error) => {
        console.error('There was an error fetching the roster data', error);
      },
    });
  }
}
