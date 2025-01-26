import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export class AwsSesHelper {
  private transporter: nodemailer.Transporter<
    SMTPTransport.SentMessageInfo,
    SMTPTransport.Options
  >;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "email-smtp.us-east-1.amazonaws.com",
      port: 465,
      auth: {
        user: process.env.AWS_SES_SMTP_USERNAME,
        pass: process.env.AWS_SES_SMTP_PASSWORD,
      },
      // tls: {
      //   rejectUnauthorized: false, // Bypass certificate validation
      // },
    });
  }

  // async sendFailureEmail(email: string, resourceId: string, fullname: string) {
  //   try {
  //     const mailOptions: Mail.Options = {
  //       from: process.env.AWS_SES_SMTP_SENDER_EMAIL as string,
  //       to: email,
  //       subject: "Your video has not been converted.",
  //       html: `
  //           <div>
  //               <h2 style="color: red;">Dear ${fullname}, your video convertion failed</h2>
  //               <p>
  //                   Click <a href="${process.env.RESOURCE_PAGE_URL}/resource/${resourceId}">here</a> to
  //                   view and retry
  //               </p>
  //           </div>
  //       `,
  //     };

  //     const data = await this.transporter.sendMail(mailOptions);

  //     return data;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async sendActivateAccountEmail(
    email: string,
    fullname: string,
    code: string
  ) {
    try {
      const mailOptions: Mail.Options = {
        from: process.env.AWS_SES_SMTP_SENDER_EMAIL as string,
        to: email,
        subject:
          "Your account has been created, click on the link below to activate it",
        html: `
            <div>
                <h2 style="color: green;">Welcome ${fullname}, activate your account and start searching for schools and courses !!!</h2>
                <p>
                    Click <a href="${process.env.RESOURCE_PAGE_URL}/activate?code=${code}">here</a> to
                    activate
                </p>
            </div>
        `,
      };

      const data = await this.transporter.sendMail(mailOptions);
      return data;
    } catch (error) {
      throw error;
    }
  }

  async sendResetPasswordEmail(email: string, fullname: string, code: string) {
    try {
      const mailOptions: Mail.Options = {
        from: process.env.AWS_SES_SMTP_SENDER_EMAIL as string,
        to: email,
        subject: "Password reset",
        html: `
            <div>
                <h2 style="color: green;">Dear ${fullname}, click on the link below to reset your password</h2>
                <p>
                    Click <a href="${process.env.RESOURCE_PAGE_URL}/reset?code=${code}">here</a> to
                    reset
                </p>
            </div>
        `,
      };

      const data = await this.transporter.sendMail(mailOptions);
      return data;
    } catch (error) {
      throw error;
    }
  }
}
