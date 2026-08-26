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

  async createWithdrawal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await walletService.createWithdrawalRequest(req.user!.id, req.body);
      success(res, result, 'Withdrawal request submitted', 201);
    } catch (err) {
      next(err);
    }
  }

  async listWithdrawals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const withdrawals = await walletService.listWithdrawals(req.user!.id);
      success(res, withdrawals, 'Withdrawals retrieved');
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
