import { Request } from 'express';

export interface JwtRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}
