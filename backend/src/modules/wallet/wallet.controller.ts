import { Request, Response, NextFunction } from 'express';
import { success } from '../../utils/response';
import { WalletService } from './wallet.service';

const walletService = new WalletService();

export class WalletController {
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await walletService.getWalletSummary(req.user!.id);
      success(res, summary, 'Wallet summary retrieved');
    } catch (err) {
      next(err);
    }
  }

  async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await walletService.withdraw(req.user!.id, req.body);
      success(res, summary, 'Withdrawal successful');
    } catch (err) {
      next(err);
    }
  }

  async listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transactions = await walletService.listTransactions(req.user!.id);
      success(res, transactions, 'Transactions retrieved');
    } catch (err) {
      next(err);
    }
  }
}
