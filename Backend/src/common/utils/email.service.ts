import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Email Service using Nodemailer with Brevo SMTP
 * Handles all email sending operations for the application
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter with Brevo SMTP configuration
   */
  private initializeTransporter() {
    const smtpUser = process.env.BREVO_SMTP_USER;
    const smtpKey = process.env.BREVO_SMTP_KEY;

    if (!smtpUser || !smtpKey) {
      this.logger.error(
        'CRITICAL: BREVO_SMTP_USER or BREVO_SMTP_KEY not configured. Email sending will fail.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpKey,
      },
    });

    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP server ready');
      }
    });
  }

  /**
   * Send OTP email for password reset
   * @param to - Recipient email address
   * @param otp - 8-digit OTP code (NEVER log this value)
   * @param firstName - User's first name for personalization
   * 
   * SECURITY: OTP is transmitted ONLY via email, never logged or exposed in responses
   */
  async sendOtpEmail(
    to: string,
    otp: string,
    firstName: string,
  ): Promise<boolean> {
    try {
      const formattedOtp = `${otp.slice(0, 4)}-${otp.slice(4)}`;
      
      const mailOptions = {
        from: '"OneStaffOS" <noreply@onestaffos.digital>',
        to: to,
        subject: 'Password Reset OTP - OneStaffOS',
        html: this.generateOtpEmailTemplate(formattedOtp, firstName),
        text: `Your OneStaffOS password reset OTP is: ${formattedOtp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      // SECURITY: Never log the OTP value, only log success/failure
      this.logger.log(`OTP email sent successfully to ${to.substring(0, 3)}***@${to.split('@')[1]}`);
      return true;
    } catch (error) {
      // SECURITY: Don't expose email in error logs to prevent user enumeration
      this.logger.error(`Failed to send OTP email: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate HTML template for OTP email
   */
  private generateOtpEmailTemplate(otp: string, firstName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0; text-align: center;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">OneStaffOS</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: bold;">Password Reset Request</h2>
              
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                Hello ${firstName},
              </p>
              
              <p style="margin: 0 0 30px; color: #64748b; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Use the following One-Time Password (OTP) to proceed with your password reset:
              </p>
              
              <!-- OTP Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 30px;">
                <tr>
                  <td style="text-align: center; padding: 30px; background-color: #f8fafc; border-radius: 8px; border: 2px dashed #3b82f6;">
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #1e293b;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                <strong>This OTP will expire in 10 minutes.</strong>
              </p>
              
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                If you did not request a password reset, please ignore this email or contact support if you have concerns.
              </p>
              
              <!-- Security Notice -->
              <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>Security Tip:</strong> Never share your OTP with anyone. OneStaffOS staff will never ask for your OTP.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f8fafc; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #94a3b8; font-size: 14px;">
                © ${new Date().getFullYear()} OneStaffOS. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send password reset confirmation email
   * @param to - Recipient email address
   * @param firstName - User's first name
   */
  async sendPasswordResetConfirmationEmail(
    to: string,
    firstName: string,
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: '"OneStaffOS" <noreply@onestaffos.digital>',
        to: to,
        subject: 'Password Reset Successful - OneStaffOS',
        html: this.generateConfirmationEmailTemplate(firstName),
        text: `Hello ${firstName},\n\nYour password has been successfully reset.\n\nIf you did not make this change, please contact support immediately.\n\nBest regards,\nOneStaffOS Team`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Password reset confirmation email sent to ${to}, MessageID: ${info.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email to ${to}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Generate HTML template for password reset confirmation
   */
  private generateConfirmationEmailTemplate(firstName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0; text-align: center;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✓ Password Reset Successful</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                Hello ${firstName},
              </p>
              
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                Your OneStaffOS password has been successfully reset. You can now log in with your new password.
              </p>
              
              <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                If you did not make this change, please contact our support team immediately.
              </p>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #dcfce7; border-left: 4px solid #10b981; border-radius: 4px;">
                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                  <strong>Account Security:</strong> We recommend using a strong, unique password and enabling two-factor authentication for additional security.
                </p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #f8fafc; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #94a3b8; font-size: 14px;">
                © ${new Date().getFullYear()} OneStaffOS. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
