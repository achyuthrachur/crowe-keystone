import uuid

from pydantic import BaseModel, ConfigDict


class PushKeysPayload(BaseModel):
    """Web Push VAPID encryption keys from the browser."""
    p256dh: str
    auth: str


class PushSubscribeRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    endpoint: str
    keys: PushKeysPayload


class PushSubscribeResponse(BaseModel):
    subscription_id: uuid.UUID


class PushDeleteRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    endpoint: str


class VapidPublicKeyResponse(BaseModel):
    key: str
