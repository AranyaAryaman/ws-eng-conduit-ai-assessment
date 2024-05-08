// roster.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
})
export class RosterComponent implements OnInit {
  userStats: UserStats[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<UserStats[]>('/api/users/roster').subscribe({
      next: (data) => {
        this.userStats = data;
      },
      error: (error) => {
        console.error('There was an error fetching the roster data', error);
      },
      // complete: () => { /* Called when the observable is complete */ }
    });
  }
}
