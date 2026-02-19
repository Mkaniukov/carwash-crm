"""Интеграция с Google Workspace: Drive (загрузка PDF), Sheets (добавление строки)."""
import io
import logging
import os
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class GoogleIntegrationService:
    """Сервис для загрузки PDF в Drive и добавления строки в Google Sheet.
    Конфигурация через переменные окружения. Без ключей методы логируют и выходят.
    """

    def __init__(self):
        self.credentials_path = os.getenv("GOOGLE_CREDENTIALS_PATH")
        self.credentials_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
        self.drive_folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")
        self.sheet_id = os.getenv("GOOGLE_SHEET_ID")

    def _get_credentials(self):
        """Возвращает credentials из файла или JSON env."""
        try:
            from google.oauth2 import service_account
        except ImportError:
            log.warning("google-auth not installed")
            return None
        if self.credentials_path and os.path.isfile(self.credentials_path):
            return service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/spreadsheets"],
            )
        if self.credentials_json:
            import json
            info = json.loads(self.credentials_json)
            return service_account.Credentials.from_service_account_info(
                info,
                scopes=["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/spreadsheets"],
            )
        log.warning("GOOGLE_CREDENTIALS_PATH or GOOGLE_CREDENTIALS_JSON not set")
        return None

    def upload_pdf_to_drive(self, pdf_bytes: bytes, at_time: datetime) -> Optional[str]:
        """Загружает PDF в Drive. Папка по году-месяцу: folder_id/YYYY-MM.
        Возвращает ссылку на файл или None."""
        creds = self._get_credentials()
        if not creds or not self.drive_folder_id:
            return None
        try:
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaIoBaseUpload
            folder_name = at_time.strftime("%Y-%m")
            drive = build("drive", "v3", credentials=creds)
            file_metadata = {"name": f"CheckIn_{at_time.strftime('%Y%m%d_%H%M')}.pdf", "parents": [self.drive_folder_id]}
            media = MediaIoBaseUpload(io.BytesIO(pdf_bytes), mimetype="application/pdf", resumable=False)
            f = drive.files().create(body=file_metadata, media_body=media, fields="id,webViewLink").execute()
            return f.get("webViewLink") or f"https://drive.google.com/file/d/{f.get('id')}/view"
        except Exception as e:
            log.exception("Drive upload failed: %s", e)
            return None

    def append_row_to_sheet(
        self,
        date: datetime,
        worker_name: str,
        car_plate: str,
        service_name: str,
        price: int,
        payment_method: str,
        drive_link: str,
    ) -> None:
        """Добавляет строку в таблицу: date, worker, car_plate, service, price, payment_method, drive_link."""
        creds = self._get_credentials()
        if not creds or not self.sheet_id:
            return
        try:
            from googleapiclient.discovery import build
            sheets = build("sheets", "v4", credentials=creds)
            row = [
                date.strftime("%d.%m.%Y"),
                date.strftime("%H:%M"),
                worker_name,
                car_plate,
                service_name,
                str(price),
                payment_method,
                drive_link,
            ]
            sheets.spreadsheets().values().append(
                spreadsheetId=self.sheet_id,
                range="A1",
                valueInputOption="USER_ENTERED",
                body={"values": [row]},
            ).execute()
        except Exception as e:
            log.exception("Sheets append failed: %s", e)
