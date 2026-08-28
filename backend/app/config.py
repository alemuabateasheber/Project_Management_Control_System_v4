from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, ValidationError
import secrets

class Settings(BaseSettings):
    database_url: str='postgresql+psycopg://mint:mint@db:5432/mint_aics_pmo'
    jwt_secret: str=''
    jwt_algorithm: str='HS256'
    access_token_minutes: int=60
    cors_origins: str='http://localhost:5173'
    admin_username: str='admin'
    admin_password: str=''
    smtp_host: str=''
    smtp_port: int=587
    smtp_username: str=''
    smtp_password: str=''
    smtp_from: str=''
    report_dir: str='/app/reports'
    model_config=SettingsConfigDict(env_file='.env', extra='ignore')
    
    @field_validator('jwt_secret')
    @classmethod
    def validate_jwt_secret(cls, v):
        if not v or v == 'CHANGE_ME_IN_PRODUCTION':
            raise ValueError('JWT_SECRET must be set to a secure random value (at least 32 characters)')
        if len(v) < 32:
            raise ValueError('JWT_SECRET must be at least 32 characters long')
        return v
    
    @field_validator('admin_password')
    @classmethod
    def validate_admin_password(cls, v):
        if not v or v == 'CHANGE_THIS_IMMEDIATELY':
            raise ValueError('ADMIN_PASSWORD must be set to a strong password')
        if len(v) < 8:
            raise ValueError('ADMIN_PASSWORD must be at least 8 characters long')
        return v

try:
    settings=Settings()
except ValidationError as e:
    raise RuntimeError(
        'Configuration error: ' + str(e) + 
        '\nPlease set secure values in .env file. See .env.example for required fields.'
    )
