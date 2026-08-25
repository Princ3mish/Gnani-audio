import os
import re
import uuid
import boto3
from botocore.config import Config

from app.core.config import settings


class StorageService:
    def __init__(self):
        self.bucket_name = settings.STORAGE_BUCKET
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            config=Config(signature_version="s3v4"),
        )

    def generate_unique_storage_key(self, original_filename: str) -> str:
        basename = os.path.basename(original_filename)
        name, ext = os.path.splitext(basename)
        # Sanitize name to allow only alphanumeric, hyphens, and underscores
        sanitized_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", name)
        sanitized_filename = f"{sanitized_name}{ext.lower()}"
        unique_id = uuid.uuid4().hex
        return f"audio/{unique_id}_{sanitized_filename}"

    def upload_file(self, local_path: str, storage_key: str, content_type: str) -> str:
        extra_args = {"ContentType": content_type}
        self.s3_client.upload_file(
            Filename=local_path,
            Bucket=self.bucket_name,
            Key=storage_key,
            ExtraArgs=extra_args,
        )
        return storage_key

    def download_file(self, storage_key: str, local_path: str) -> None:
        self.s3_client.download_file(
            Bucket=self.bucket_name,
            Key=storage_key,
            Filename=local_path,
        )

    def get_file_bytes(self, storage_key: str) -> bytes:
        response = self.s3_client.get_object(
            Bucket=self.bucket_name,
            Key=storage_key,
        )
        return response["Body"].read()

