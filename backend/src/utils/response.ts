import { Response } from 'express';

import { HttpStatus } from '../constants/httpStatus';

export function success<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode: number = HttpStatus.OK
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): Response {
  return res.status(HttpStatus.OK).json({
    success: true,
    message: 'Success',
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function error(res: Response, message: string, statusCode: number = HttpStatus.BAD_REQUEST): Response {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}
