export class MockAuth {
  private static user: string | null = null;

  static login(username: string): boolean {
    if (!username.trim()) return false;
    this.user = username.trim();
    localStorage.setItem('mock_user', this.user);
    return true;
  }

  static getUser(): string | null {
    return this.user || localStorage.getItem('mock_user');
  }

  static logout() {
    this.user = null;
    localStorage.removeItem('mock_user');
  }

  static isAuthenticated(): boolean {
    return !!this.getUser();
  }
}
