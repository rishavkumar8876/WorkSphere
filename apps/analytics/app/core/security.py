from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def verify_service_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Enforces service-to-service authentication between Express Core API and FastAPI.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required service authentication header 'X-API-Key'",
        )
    
    if api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid service API key. Unauthorized inter-service call.",
        )
        
    return api_key
