from pydantic import BaseModel


class SignedDownloadUrlResponse(BaseModel):
    url: str
