import { Request, Response, NextFunction } from 'express';
import { CategoryScope } from '@prisma/client';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/error';
import { CategoryService } from './category.service';

const categoryService = new CategoryService();

export class CategoryController {
  async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scopeRaw = req.query.scope as string | undefined;
      if (scopeRaw && !Object.values(CategoryScope).includes(scopeRaw as CategoryScope)) {
        throw new AppError(`Invalid scope. Must be one of: ${Object.values(CategoryScope).join(', ')}`, 400);
      }
      const categories = await categoryService.listPublic(scopeRaw as CategoryScope | undefined);
      success(res, categories, 'Categories retrieved');
    } catch (err) {
      next(err);
    }
  }

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoryService.listForAdmin();
      success(res, categories, 'Categories retrieved');
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.create(req.body);
      success(res, category, 'Category created', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      success(res, category, 'Category updated');
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoryService.updateStatus(req.params.id, req.body.status);
      success(res, category, 'Category status updated');
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await categoryService.remove(req.params.id);
      success(res, null, 'Category deleted');
    } catch (err) {
      next(err);
    }
  }
}
