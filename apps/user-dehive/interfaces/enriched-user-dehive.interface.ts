export interface EnrichedUserDehive {
  _id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: 'online' | 'offline' | 'busy';
  server_count: number;
  last_login: Date;
}
