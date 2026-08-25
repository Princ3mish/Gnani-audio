import os
import re
import uuid
import shutil
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

LOCAL_STORAGE_DIR = Path(__file__).resolve().parents[2] / "storage_data"


class StorageService:
    def __init__(self):
        self.bucket_name = settings.STORAGE_BUCKET
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            config=Config(
                signature_version="s3v4",
                connect_timeout=2,
                read_timeout=5,
                retries={"max_attempts": 1},
            ),
        )
        LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    def generate_unique_storage_key(self, original_filename: str) -> str:
        basename = os.path.basename(original_filename)
        name, ext = os.path.splitext(basename)
        sanitized_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)
        sanitized_filename = f"{sanitized_name}{ext.lower()}"
        unique_id = uuid.uuid4().hex
        return f"audio/{unique_id}_{sanitized_filename}"

    def upload_file(self, local_path: str, storage_key: str, content_type: str) -> str:
        extra_args = {"ContentType": content_type}
        try:
            self.s3_client.upload_file(
                Filename=local_path,
                Bucket=self.bucket_name,
                Key=storage_key,
                ExtraArgs=extra_args,
            )
        except (BotoCoreError, ClientError, Exception) as exc:
            # Fallback to local storage directory when S3 daemon is unreachable
            target_path = LOCAL_STORAGE_DIR / storage_key
            target_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(local_path, target_path)
            print(f"S3 upload fallback to local disk ({storage_key}): {exc}")

        return storage_key

    def download_file(self, storage_key: str, local_path: str) -> None:
        try:
            self.s3_client.download_file(
                Bucket=self.bucket_name,
                Key=storage_key,
                Filename=local_path,
            )
        except (BotoCoreError, ClientError, Exception) as exc:
            target_path = LOCAL_STORAGE_DIR / storage_key
            if target_path.exists():
                shutil.copyfile(target_path, local_path)
                print(f"S3 download fallback from local disk ({storage_key})")
            else:
                raise FileNotFoundError(f"Storage key {storage_key} not found in S3 or local disk.") from exc

    def get_file_bytes(self, storage_key: str) -> bytes:
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=storage_key,
            )
            return response["Body"].read()
        except (BotoCoreError, ClientError, Exception) as exc:
            target_path = LOCAL_STORAGE_DIR / storage_key
            if target_path.exists():
                return target_path.read_bytes()
            raise FileNotFoundError(f"Storage key {storage_key} not found in S3 or local disk.") from exc
