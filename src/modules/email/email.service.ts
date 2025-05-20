/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envConfig } from '~/common/config/env.config';

interface User {
  id: number;
  username?: string | null;
  email: string;
  avatarUrl?: string | null;
  role?: string;
}

interface Post {
  id: number;
  title: string;
  slug: string;
  postType: string;
  status?: string;
}

interface ServicePackage {
  id: number;
  name: string;
  price: number;
  duration: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: envConfig.EMAIL_HOST || 'smtp.gmail.com',
      port: envConfig.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: envConfig.EMAIL_USER,
        pass: envConfig.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3',
      },
    });

    this.logger.log(
      `Email service initialized with: ${envConfig.EMAIL_HOST || 'smtp.gmail.com'}:${
        envConfig.EMAIL_PORT || 587
      }`,
    );
  }

  async sendFreePostCreationEmail(
    user: User,
    post: Post,
  ): Promise<nodemailer.SentMessageInfo | null> {
    if (!this.isValidEmail(user.email)) {
      this.logger.warn(`Invalid or temporary email detected: ${user.email}`);
      return null;
    }

    const subject = 'Bài đăng đã được tạo - Nâng cấp để tối ưu hiệu quả';
    const html = `
      <h1>Xin chào ${user.username || user.email}!</h1>
      <p>Bài đăng <strong>${post.title}</strong> của bạn đã được tạo thành công.</p>
      <p>Để tăng khả năng tìm thấy đồ đạc, hãy xem xét việc nâng cấp lên gói trả phí:</p>
      <ul>
        <li>Ưu tiên hiển thị trên trang chủ và kết quả tìm kiếm</li>
        <li>Được hỗ trợ tìm kiếm tích cực từ cộng đồng</li>
        <li>Tăng tỷ lệ tìm thấy đồ vật gấp nhiều lần</li>
      </ul>
      <p>Xem các gói dịch vụ <a href="${envConfig.FRONTEND_URL}/upgrade/${post.id}">tại đây</a></p>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendPostApprovalEmail(
    user: User,
    post: Post,
    packageInfo?: ServicePackage,
  ): Promise<nodemailer.SentMessageInfo | null> {
    if (!this.isValidEmail(user.email)) {
      this.logger.warn(`Invalid or temporary email detected: ${user.email}`);
      return null;
    }

    const subject = 'Bài đăng đã được phê duyệt';
    const html = `
      <h1>Xin chào ${user.username || user.email}!</h1>
      <p>Chúc mừng! Bài đăng <strong>${post.title}</strong> của bạn đã được phê duyệt.</p>
      ${
        packageInfo
          ? `
      <p>Gói dịch vụ: <strong>${packageInfo.name}</strong></p>
      <p>Thời hạn: ${packageInfo.duration} ngày</p>
      `
          : ''
      }
      <p>Bài đăng của bạn hiện đã được hiển thị công khai trên hệ thống.</p>
      <p>Xem bài đăng <a href="${envConfig.FRONTEND_URL}/posts/${post.slug}">tại đây</a>.</p>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendExpirationReminderEmail(
    user: User,
    post: Post,
    expiryDate: Date,
  ): Promise<nodemailer.SentMessageInfo | null> {
    if (!this.isValidEmail(user.email)) {
      this.logger.warn(`Invalid or temporary email detected: ${user.email}`);
      return null;
    }

    const formattedDate = new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(expiryDate);

    const subject = 'Thông báo: Bài đăng của bạn sắp hết hạn';
    const html = `
      <h1>Xin chào ${user.username || user.email}!</h1>
      <p>Bài đăng <strong>${post.title}</strong> của bạn sẽ hết hạn vào <strong>${formattedDate}</strong>.</p>
      <p>Để bài đăng tiếp tục được ưu tiên hiển thị, vui lòng gia hạn gói dịch vụ.</p>
      <p>Gia hạn bài đăng <a href="${envConfig.FRONTEND_URL}/renew/${post.id}">tại đây</a>.</p>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return false;
    }

    const disposableDomains = [
      'tempmail',
      'throwaway',
      'fakeinbox',
      'mailinator',
      'yopmail',
      'guerrilla',
      'temp-mail',
      'temp.com',
      'tempmail.com',
      'tempr.email',
      'dispostable',
      'sharklasers',
      'guerrillamail',
      'mailnesia',
      '10minutemail',
      'spamgourmet',
      'trashmail',
      'getnada',
      'maildrop',
    ];

    const domain = email.split('@')[1].toLowerCase();

    for (const disposable of disposableDomains) {
      if (domain.includes(disposable)) {
        return false;
      }
    }

    return true;
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    from = envConfig.EMAIL_FROM,
  ): Promise<nodemailer.SentMessageInfo | null> {
    try {
      try {
        await this.transporter.verify();
      } catch (error) {
        this.logger.warn(
          'Transporter verification failed, recreating transporter',
          error,
        );
        this.initializeTransporter();
      }

      const mailOptions = {
        from,
        to,
        subject,
        html,
      };

      this.logger.log(`Attempting to send email to: ${to}`);
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      return null;
    }
  }
}
