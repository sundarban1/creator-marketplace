import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { MeetupService } from './meetup.service';

const meetupService = new MeetupService();

export class MeetupController {
  // ---- Creator-facing ----

  async listVisible(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meetups = await meetupService.listVisibleForCreator();
      success(res, meetups, 'Meetups retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meetup = await meetupService.getForCreator(req.params.idOrSlug);
      success(res, meetup, 'Meetup retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listMyRegistrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrations = await meetupService.listMyRegistrations(req.user!.id);
      success(res, registrations, 'Registrations retrieved');
    } catch (err) {
      next(err);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registration = await meetupService.register(req.user!.id, req.params.id, req.body);
      success(res, registration, 'Registered for meetup', 201);
    } catch (err) {
      next(err);
    }
  }

  // ---- Admin-facing ----

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meetups = await meetupService.listForAdmin();
      success(res, meetups, 'Meetups retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meetup = await meetupService.getForAdmin(req.params.id);
      success(res, meetup, 'Meetup retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meetup = await meetupService.create(req.body);
      success(res, meetup, 'Meetup created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meetup = await meetupService.update(req.params.id, req.body);
      success(res, meetup, 'Meetup updated');
    } catch (err) {
      next(err);
    }
  }

  async listRegistrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrations = await meetupService.listRegistrationsForAdmin(req.params.id, req.query as never);
      success(res, registrations, 'Registrations retrieved');
    } catch (err) {
      next(err);
    }
  }

  async acceptRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registration = await meetupService.accept(req.params.id, req.params.registrationId, req.user!.id);
      success(res, registration, 'Registration accepted');
    } catch (err) {
      next(err);
    }
  }

  async rejectRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registration = await meetupService.reject(req.params.id, req.params.registrationId, req.user!.id);
      success(res, registration, 'Registration rejected');
    } catch (err) {
      next(err);
    }
  }

  async checkInRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registration = await meetupService.checkIn(req.params.id, req.params.registrationId, req.user!.id);
      success(res, registration, 'Checked in');
    } catch (err) {
      next(err);
    }
  }

  async undoCheckInRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registration = await meetupService.undoCheckIn(req.params.id, req.params.registrationId);
      success(res, registration, 'Check-in undone');
    } catch (err) {
      next(err);
    }
  }
}
