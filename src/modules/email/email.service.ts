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

    const subject = '💡 [Gợi ý nâng cấp] Quảng bá & nhận thông báo bài đăng';
    const html = `
    <!DOCTYPE html>
    <html>

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tăng cường khả năng tìm kiếm đồ thất lạc của bạn</title>
        <style>
            @keyframes pulse {
                0% {
                    transform: scale(1);
                }

                50% {
                    transform: scale(1.05);
                }

                100% {
                    transform: scale(1);
                }
            }

            @keyframes bounce {

                0%,
                100% {
                    transform: translateY(0);
                }

                50% {
                    transform: translateY(-4px);
                }
            }
        </style>
    </head>

    <body
        style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td
                    style="padding: 28px 0; text-align: center; background-color: #ffffff; border-bottom: 2px solid #e0e0e0; display: flex; flex-direction: column; align-items: center;">
                    <div style="display: flex; align-items: center;">
                        <img src="https://timdo.io.vn/_next/image?url=%2Fimages%2Flogo.png&w=48&q=75" alt="Logo"
                            style="max-width: 150px; height: auto; margin-right: 15px;">
                        <div style="text-align: left;">
                            <h2 style="font-family: Arial, sans-serif; color: #333; margin: 0;">Hệ thống tìm kiếm đồ thất
                                lạc số 1 Việt
                                Nam</h2>
                            <a href="https://timdo.io.vn/" target="_blank"
                                style="font-family: Arial, sans-serif; color: #1a73e8;  font-size: 14px; margin: 0; text-decoration: none; ">timdo.io.vn
                            </a>
                        </div>
                    </div>
                </td>
            </tr>
        </table>

        <table role="presentation"
            style="width: 100%; max-width: 600px; margin: 12px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
                <td style="padding: 30px;">
                    <p style="margin: 0 0 20px; font-size: 16px;">
                        <b>👋 Xin chào: </b> <b style="color: #00b14f;">${user.username}</b>,
                    </p>
                    <div>Bài viết của bạn đã được cập nhật trên <a href="https://timdo.io.vn/${post.slug}"
                            style="text-decoration: none; color: #1a73e8; font-weight: 600;">danh sách tìm kiếm đồ.</a>
                    </div>
                    <p
                        style="background-color: #fff3cd; color: #856404; padding: 8px; border: 1px solid #f7f3e9; border-radius: 4px; font-size: 14px;">
                        <span style="font-size: 18px;">⚠️</span>
                        <b>Chú ý: </b>
                        Vì hiện tại 1 ngày hệ thống nhận rất nhiều thông tin NHẶT ĐƯỢC & BỊ MẤT nên bài đăng của bạn dễ bị
                        trôi và khó có
                        người tiếp cận.
                    </p>

                    <i>Chúng tôi khuyên bạn nên cân nhắc sử dụng các gói trả phí <b>Tin Ưu
                            Tiên/Tìm Gấp</b> để hệ thống hỗ
                        trợ tốt hơn, cũng
                        như
                        tăng tỉ lệ tìm thấy 🔎
                    </i>
                    <div style="margin-bottom: 24px; margin-top: 20px;">
                        <div
                            style="background: linear-gradient(to right, #ebf8ff, #e0f2fe); padding: 8px; border-radius: 8px; border: 1px solid #bfdbfe;">
                            <div style="display: flex; align-items: start; gap: 6px;">
                                <div style="flex-shrink: 0; margin-top: 4px;">
                                    <span style="font-size: 18px;">💎</span>
                                </div>
                                <div>
                                    <h3
                                        style="font-size: 16px; font-weight: 600; color: #1e40af; margin-bottom: 4px; margin-top: 6px;">
                                        Tối ưu cơ hội tìm lại đồ của bạn
                                    </h3>
                                    <p style="color: #374151; line-height: 1.4; margin-top: 6px; margin-bottom: 6px;">
                                        Đầu tư cho tin đăng là
                                        <span style="font-weight: 600; font-style: italic; color: #1d4ed8;">
                                            tăng khả năng
                                        </span>
                                        tìm lại đồ thất lạc. Với cơ chế ưu tiên hiển thị, tin của bạn sẽ tiếp cận nhiều
                                        người xem hơn.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
                        <h2 style="margin: 0 0 15px; color: #1a73e8; font-size: 18px;">
                            Bạn có biết?
                        </h2>
                        <p style="font-size: 16px;">Sự khác biệt của gói tin trả phí : <a
                                href="https://timdo.io.vn/danh-sach-tin-uu-tien"
                                style="text-decoration: none; font-weight: 600; font-style: italic;">Danh sách
                                tin ưu tiên</a></p>
                        <ul style="margin: 0; padding: 0 0 0 20px;">
                            <li style="margin-bottom: 10px;">Tin Trả Phí sẽ ghim tin của bạn nổi bật hơn, tăng cơ hội tìm
                                lại
                                đồ thất lạc.</li>
                            <li style="margin-bottom: 10px;">Đội ngũ ADMIN có trách nhiệm xác thực thông tin và duy trì kết
                                nối tìm kiếm đồ
                            </li>
                            <li style="margin-bottom: 10px;">Đăng tải bài viết trên các nền tảng khác như group, fanpage
                                facebook
                            </li>
                            <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 12px;">
                              <li style="flex: 1 1 100%; max-width: 100%; display: flex; justify-content: center;">
                                  <span style="display: inline-flex; align-items: center; font-size: 14px; animation: pulse 2s infinite; background: linear-gradient(to right, #ebf8ff, #2563eb); color: white; font-weight: bold; padding: 8px 12px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                                      🔍 Tin nổi bật
                                  </span>
                              </li>
                              <li style="flex: 1 1 100%; max-width: 100%; display: flex; justify-content: center;">
                                  <span style="display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500; background: linear-gradient(to right, #a855f7, #9333ea); color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2); animation: bounce 1s infinite;">
                                      📣 Tin ưu tiên
                                  </span>
                              </li>
                              <li style="flex: 1 1 100%; max-width: 100%; display: flex; justify-content: center;">
                                  <span style="display: inline-flex; align-items: center; font-size: 14px; transition: all 0.3s; background: linear-gradient(to right, #c53030, #fc8181); color: white; font-weight: bold; padding: 8px 12px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                                      📌 Tin tìm gấp VIP
                                  </span>
                              </li>
                          </ul>
                        </ul>
                    </div>
                    <div
                        style="background-color: #d1fae5; padding: 4px; border-radius: 8px; border: 1px solid #bbf7d0; margin-top: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: #16a34a; font-weight: 600;">✓</span>
                            <p style="font-size: 14px; color: #165e29;margin: 0;">
                                <span style="font-weight: bold;">Số người dùng</span> đã tìm thấy đồ thất lạc khi sử
                                dụng
                                <span
                                    style="margin: 0 8px; text-transform: uppercase; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background-color: #ebf8ff; color: #1d4ed8; border-radius: 9999px; border: 1px solid #bfdbfe;">
                                    <span style="font-size: 12px;">⭐️</span>
                                    gói trả phí
                                </span>
                                là cao hơn
                            </p>
                        </div>
                    </div>
                    <h2 style="margin: 30px 0 20px; color: #1a73e8; font-size: 20px;">
                        Cách nâng cấp bài đăng?
                    </h2>
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
                        <h3 style="margin: 0 0 10px; font-size: 16px; color: #1a73e8;">Cách 1: Nâng cấp bài đăng</h3>
                        <ol style="margin: 0; padding-left: 20px; font-size: 14px;">
                            <li style="margin-bottom: 15px;">
                                <div style="display: flex; align-items: center;">
                                    <img src="https://timdo.io.vn/uploads/dn.png" alt="Bước 1"
                                        style="width: 60px; height: 60px; margin-right: 10px;">
                                    Đăng nhập vào tài khoản của bạn.
                                </div>
                            </li>
                            <li style="margin-bottom: 15px;">
                                <div style="display: flex; align-items: center;">
                                    <img src="https://timdo.io.vn/uploads/dsdt.png" alt="Bước 2"
                                        style="width: 60px; height: 60px; margin-right: 10px;">
                                    Vào danh sách tin đăng và chọn bài đăng mà bạn muốn nâng cấp.
                                </div>
                            </li>
                            <li style="margin-bottom: 15px;">
                                <div style="display: flex; align-items: center;">
                                    Nhấn vào nút <b style="margin: 0 4px;">Nâng cấp</b> để chọn gói dịch vụ phù hợp.
                                </div>
                            </li>
                            <li style="margin-bottom: 15px;">
                                <div style="display: flex; align-items: center;">
                                    Theo dõi hướng dẫn để hoàn tất quá trình thanh toán.
                                </div>
                            </li>
                        </ol>
                        <h3 style="margin: 0 0 10px; font-size: 16px; color: #1a73e8;">Cách 2: Liên hệ với quản trị viên
                        </h3>
                        <p style="margin: 0; font-size: 14px;">Nếu bạn gặp khó khăn trong việc nâng cấp, vui lòng liên hệ
                            với quản trị viên
                            qua:</p>
                        <p style="margin: 0; font-size: 14px; margin: 8px 0; color: #666666;">
                            ✆ Fanpage: https://www.facebook.com/timdo.io.vn<br>
                            ✉ Email: hotrocongdong247@gmail.com
                        </p>
                    </div>
                      <div
                          style="background-color: #e7ffe7; padding: 20px; border-radius: 8px; margin-bottom: 20px; margin-top: 20px; border: 1px solid #c3e6c3;">
                          <p>Cảm ơn bạn đã lựa chọn nền tảng tìm đồ thất lạc của chúng tôi.</p>
                          <h3 style="margin: 0 0 15px; color: #28a745; font-size: 18px;">
                              Chúc bạn sớm tìm thấy đồ của mình!
                          </h3>
                          <p style="margin: 0 0 15px; font-size: 14px; font-style: italic;">
                              Chúng tôi ở đây để hỗ trợ bạn từng bước trong hành trình này.❤️
                          </p>
                      </div>
                    <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                            Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ:
                        </p>
                        <p style="margin: 0; font-size: 14px; color: #666666;">
                            ✆ Fanpage: https://www.facebook.com/timdo.io.vn<br>
                            ✉ Email: hotrocongdong247@gmail.com
                        </p>
                    </div>
                </td>
            </tr>
        </table>

        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;">
            <tr>
                <td style="padding: 20px 30px; text-align: center; color: #666666; font-size: 12px;">
                    <p style="margin: 0 0 10px;">
                        © 2024 hoangnv. Tất cả các quyền được bảo lưu.
                    </p>
                    <p style="margin: 0;">
                        Bạn nhận được email này vì bạn đã đăng tin trên website của chúng tôi.<br>
                    </p>
                </td>
            </tr>
        </table>
    </body>

    </html>
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
    console.log(packageInfo);

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
      <p>Xem bài đăng <a href="${envConfig.FRONTEND_URL}/${post.slug}">tại đây</a>.</p>
        `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendPostRejectionEmail(
    user: User,
    post: Post,
    reason?: string,
  ): Promise<nodemailer.SentMessageInfo | null> {
    if (!this.isValidEmail(user.email)) {
      this.logger.warn(`Invalid or temporary email detected: ${user.email}`);
      return null;
    }

    const subject = 'Bài đăng của bạn đã bị từ chối';
    const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rejection Notification Email</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              border: 1px solid #ddd;
            }
            .header {
              background-color: #f44336;
              color: #fff;
              text-align: center;
              padding: 40px 20px;
            }
            .header img {
              max-width: 80px;
              margin-bottom: 20px;
            }
            .header h2 {
              margin: 0;
              font-size: 24px;
              line-height: 1.3;
            }
            .content {
              padding: 30px 20px;
              line-height: 1.6;
              color: #333;
            }
            .content p {
              margin: 15px 0;
            }
            .content strong {
              color: #f44336;
            }
            .footer {
              background-color: #f9f9f9;
              text-align: center;
              padding: 20px;
              font-size: 12px;
              color: #999;
              border-top: 1px solid #eee;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://timdo.io.vn/_next/image?url=%2Fimages%2Flogo.png&w=128&q=75" alt="Timdo.io.vn">
              <h2>Yêu cầu bài viết của bạn đã bị từ chối</h2>
            </div>
            <div class="content">
              <p>Xin chào <strong>${user.username}</strong>,</p>
              <p>Bài viết của bạn với tiêu đề <strong>"${post.title}"</strong> đã bị từ chối.</p>
              <p>Lý do: ${reason} có thể là nội dung không đủ tiêu chuẩn hoặc không chính xác. Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
            </div>
            <div class="footer">
              Trân trọng,<br>
              Đội ngũ hỗ trợ<br>
              (Email này được gửi tự động, vui lòng không trả lời trực tiếp.)
            </div>
          </div>
        </body>
        </html>
    `;

    return this.sendEmail(user.email, subject, html);
  }

  async sendPaymentConfirmationEmail(
    user: User,
    post: Post,
    packageInfo: ServicePackage,
  ): Promise<nodemailer.SentMessageInfo | null> {
    if (!this.isValidEmail(user.email)) {
      this.logger.warn(`Invalid or temporary email detected: ${user.email}`);
      return null;
    }
    console.log(packageInfo);

    const subject = 'Thanh toán đã được xác nhận';
    const html = `
        <!DOCTYPE html>
        <html>

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tăng cường khả năng tìm kiếm đồ thất lạc của bạn</title>
            <style>
                @keyframes pulse {
                    0% {
                        transform: scale(1);
                    }

                    50% {
                        transform: scale(1.05);
                    }

                    100% {
                        transform: scale(1);
                    }
                }

                @keyframes bounce {

                    0%,
                    100% {
                        transform: translateY(0);
                    }

                    50% {
                        transform: translateY(-4px);
                    }
                }
            </style>
        </head>

        <body
            style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td
                        style="padding: 28px 0; text-align: center; background-color: #ffffff; border-bottom: 2px solid #e0e0e0; display: flex; flex-direction: column; align-items: center;">
                        <div style="display: flex; align-items: center;">
                            <img src="https://timdo.io.vn/_next/image?url=%2Fimages%2Flogo.png&w=48&q=75" alt="Logo"
                                style="max-width: 150px; height: auto; margin-right: 15px;">
                            <div style="text-align: left;">
                                <h2 style="font-family: Arial, sans-serif; color: #333; margin: 0;">Hệ thống tìm kiếm đồ thất
                                    lạc số 1 Việt
                                    Nam</h2>
                                <a href="https://timdo.io.vn/" target="_blank"
                                    style="font-family: Arial, sans-serif; color: #1a73e8;  font-size: 14px; margin: 0; text-decoration: none; ">timdo.io.vn
                                </a>
                            </div>
                        </div>
                    </td>
                </tr>
            </table>

            <table role="presentation"
                style="width: 100%; max-width: 600px; margin: 12px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                    <td style="padding: 30px;">
                        <p style="margin: 0 0 20px; font-size: 16px;">
                            <b>👋 Xin chào: </b> <b style="color: #00b14f;">${user.username} </b>,
                        </p>
                        <p>Chúng tôi xin thông báo rằng bài viết của bạn với tiêu đề <strong>"${post.title}"</strong> đã được
                            phê duyệt và hiện đang được hiển thị trên trang web của chúng tôi.❤️</p>

                        <div>Để kiểm tra bài viết của bạn, vui lòng truy cập vào <a
                                href="https://timdo.io.vn/danh-sach-tin-uu-tien"
                                style="text-decoration: none; color: #1a73e8; font-weight: 600;">danh sách tin ưu tiên. </a>
                        </div>
                        <div style="margin-bottom: 24px; margin-top: 20px;">
                            <div
                                style="background: linear-gradient(to right, #ebf8ff, #e0f2fe); padding: 8px; border-radius: 8px; border: 1px solid #bfdbfe;">
                                <div style="display: flex; align-items: start; gap: 6px;">
                                    <div style="flex-shrink: 0; margin-top: 4px;">
                                        <span style="font-size: 18px;">💎</span>
                                    </div>
                                    <div>
                                        <h3
                                            style="font-size: 16px; font-weight: 600; color: #1e40af; margin-bottom: 4px; margin-top: 6px;">
                                            Tối ưu cơ hội tìm lại đồ của bạn
                                        </h3>
                                        <p style="color: #374151; line-height: 1.4; margin-top: 6px; margin-bottom: 6px;">
                                            Đầu tư cho tin đăng là
                                            <span style="font-weight: 600; font-style: italic; color: #1d4ed8;">
                                                tăng khả năng
                                            </span>
                                            tìm lại đồ thất lạc. Với cơ chế ưu tiên hiển thị, tin của bạn sẽ tiếp cận nhiều
                                            người xem hơn.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
                            <h2 style="margin: 0 0 15px; color: #1a73e8; font-size: 18px;">
                                Bạn có biết?
                            </h2>
                            <p style="font-size: 16px;">Sự khác biệt của gói tin trả phí : <a
                                    href="https://timdo.io.vn/danh-sach-tin-uu-tien"
                                    style="text-decoration: none; font-weight: 600; font-style: italic;">Danh sách
                                    tin ưu tiên</a></p>
                            <ul style="margin: 0; padding: 0 0 0 20px;">
                                <li style="margin-bottom: 10px;">Tin Trả Phí sẽ ghim tin của bạn nổi bật hơn, tăng cơ hội tìm
                                    lại
                                    đồ thất lạc.</li>
                                <li style="margin-bottom: 10px;">Đội ngũ ADMIN có trách nhiệm xác thực thông tin và duy trì kết
                                    nối tìm kiếm đồ
                                </li>
                                <li style="margin-bottom: 10px;">Đăng tải bài viết trên các nền tảng khác như group, fanpage
                                    facebook
                                </li>
                                <ul
                                    style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 12px;">
                                    <li style="flex: 1 1 100%; max-width: 100%; display: flex; justify-content: center;">
                                        <span
                                            style="display: inline-flex; align-items: center; font-size: 14px; animation: pulse 2s infinite; background: linear-gradient(to right, #ebf8ff, #2563eb); color: white; font-weight: bold; padding: 8px 12px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                                            🔍 Tin nổi bật
                                        </span>
                                    </li>
                                    <li style="flex: 1 1 100%; max-width: 100%; display: flex; justify-content: center;">
                                        <span
                                            style="display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 9999px; font-size: 14px; font-weight: 500; background: linear-gradient(to right, #a855f7, #9333ea); color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2); animation: bounce 1s infinite;">
                                            📣 Tin ưu tiên
                                        </span>
                                    </li>
                                    <li style="flex: 1 1 100%; max-width: 100%; display: flex; justify-content: center;">
                                        <span
                                            style="display: inline-flex; align-items: center; font-size: 14px; transition: all 0.3s; background: linear-gradient(to right, #c53030, #fc8181); color: white; font-weight: bold; padding: 8px 12px; border-radius: 9999px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                                            📌 Tin tìm gấp VIP
                                        </span>
                                    </li>
                                </ul>
                            </ul>
                        </div>
                        <div
                            style="background-color: #d1fae5; padding: 4px; border-radius: 8px; border: 1px solid #bbf7d0; margin-top: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="color: #16a34a; font-weight: 600;">✓</span>
                                <p style="font-size: 14px; color: #165e29;margin: 0;">
                                    <span style="font-weight: bold;">Số người dùng</span> đã tìm thấy đồ thất lạc khi sử
                                    dụng
                                    <span
                                        style="margin: 0 8px; text-transform: uppercase; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background-color: #ebf8ff; color: #1d4ed8; border-radius: 9999px; border: 1px solid #bfdbfe;">
                                        <span style="font-size: 12px;">⭐️</span>
                                        gói trả phí
                                    </span>
                                    là cao hơn
                                </p>
                            </div>
                        </div>
                        <h2 style="margin: 30px 0 20px; color: #1a73e8; font-size: 20px;">
                            Cách nâng cấp bài đăng?
                        </h2>
                        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; background-color: #f9f9f9;">
                            <h3 style="margin: 0 0 10px; font-size: 16px; color: #1a73e8;">Cách 1: Nâng cấp bài đăng</h3>
                            <ol style="margin: 0; padding-left: 20px; font-size: 14px;">
                                <li style="margin-bottom: 15px;">
                                    <div style="display: flex; align-items: center;">
                                        <img src="https://timdo.io.vn/uploads/dn.png" alt="Bước 1"
                                            style="width: 60px; height: 60px; margin-right: 10px;">
                                        Đăng nhập vào tài khoản của bạn.
                                    </div>
                                </li>
                                <li style="margin-bottom: 15px;">
                                    <div style="display: flex; align-items: center;">
                                        <img src="https://timdo.io.vn/uploads/dsdt.png" alt="Bước 2"
                                            style="width: 60px; height: 60px; margin-right: 10px;">
                                        Vào danh sách tin đăng và chọn bài đăng mà bạn muốn nâng cấp.
                                    </div>
                                </li>
                                <li style="margin-bottom: 15px;">
                                    <div style="display: flex; align-items: center;">
                                        Nhấn vào nút <b style="margin: 0 4px;">Nâng cấp</b> để chọn gói dịch vụ phù hợp.
                                    </div>
                                </li>
                                <li style="margin-bottom: 15px;">
                                    <div style="display: flex; align-items: center;">
                                        Theo dõi hướng dẫn để hoàn tất quá trình thanh toán.
                                    </div>
                                </li>
                            </ol>
                            <h3 style="margin: 0 0 10px; font-size: 16px; color: #1a73e8;">Cách 2: Liên hệ với quản trị viên
                            </h3>
                            <p style="margin: 0; font-size: 14px;">Nếu bạn gặp khó khăn trong việc nâng cấp, vui lòng liên hệ
                                với quản trị viên
                                qua:</p>
                            <p style="margin: 0; font-size: 14px; margin: 8px 0; color: #666666;">
                                ✆ Fanpage: https://www.facebook.com/timdo.io.vn<br>
                                ✉ Email: hotrocongdong247@gmail.com
                            </p>
                        </div>
                        <div
                            style="background-color: #e7ffe7; padding: 20px; border-radius: 8px; margin-bottom: 20px; margin-top: 20px; border: 1px solid #c3e6c3;">
                            <p>Cảm ơn bạn đã lựa chọn nền tảng tìm đồ thất lạc của chúng tôi.</p>
                            <h3 style="margin: 0 0 15px; color: #28a745; font-size: 18px;">
                                Chúc bạn sớm tìm thấy đồ của mình!
                            </h3>
                            <p style="margin: 0 0 15px; font-size: 14px; font-style: italic;">
                                Chúng tôi ở đây để hỗ trợ bạn từng bước trong hành trình này.❤️
                            </p>
                        </div>

                        <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
                            <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                                Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ:
                            </p>
                            <p style="margin: 0; font-size: 14px; color: #666666;">
                                ✆ Fanpage: https://www.facebook.com/timdo.io.vn<br>
                                ✉ Email: hotrocongdong247@gmail.com
                            </p>
                        </div>
                    </td>
                </tr>
            </table>

            <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;">
                <tr>
                    <td style="padding: 20px 30px; text-align: center; color: #666666; font-size: 12px;">
                        <p style="margin: 0 0 10px;">
                            © 2024 hoangnv. Tất cả các quyền được bảo lưu.
                        </p>
                        <p style="margin: 0;">
                            Bạn nhận được email này vì bạn đã đăng tin trên website của chúng tôi.<br>
                        </p>
                    </td>
                </tr>
            </table>
        </body>

        </html>
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
