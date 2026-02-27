import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

class EmailService:
    def __init__(self):
        # 環境変数から設定を取得
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_pass = os.getenv("SMTP_PASS")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)

    def send_invitation_email(self, to_email: str, inviter_name: str) -> bool:
        """招待メールを送信する"""
        if not self.smtp_user or not self.smtp_pass:
            print("[EMAIL_SERVICE] Warning: SMTP credentials not set. Skipping email send.")
            return False

        # メールの内容設定
        subject = f"【補助金システム】{inviter_name}様より招待が届いています"
        
        # ログインURL (本番環境のURLを使用。設定されていなければVercelのデフォルトを想定)
        app_url = os.getenv("NEXTAUTH_URL", "https://subsidy-app-five.vercel.app")
        
        body = f"""
補助金システムへの招待が届きました。

管理者（{inviter_name}）があなたのメールアドレスを承認しました。
以下のリンクからGoogleログインを行うことで、すぐにシステムをご利用いただけます。

ログインURL: {app_url}/auth/login

※このメールに心当たりがない場合は、破棄してください。
--------------------------------------------------
補助金申請・管理プラットフォーム
        """

        msg = MIMEMultipart()
        msg['From'] = self.from_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        try:
            # SMTP接続と送信
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg)
            server.quit()
            print(f"[EMAIL_SERVICE] Email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"[EMAIL_SERVICE] Failed to send email: {e}")
            return False

# シングルトンインスタンス
email_service = EmailService()
