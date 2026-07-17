import { PublicRepository } from './public.repository';

export class PublicService {
  private repo: PublicRepository;

  constructor() {
    this.repo = new PublicRepository();
  }

  async getLandingStats() {
    return this.repo.getLandingStats();
  }

  async getComingSoon() {
    return this.repo.getComingSoon();
  }
}
